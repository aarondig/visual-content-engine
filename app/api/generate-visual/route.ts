import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: Set REPLICATE_API_TOKEN in your .env.local (never commit secrets!)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN environment variable');
const REPLICATE_MODEL_VERSIONS: Record<string, string> = {
  sdxl: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc", // SDXL
  sd15: "27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478", // SD 1.5
  dreamshaper: "6197db9cdf865a7349acaf20a7d20fe657d9c04cc0c478ec2b23565542715b95", // DreamShaper
  gptimage: "openai/gpt-image-1" // Use as-is for OpenAI's model (if supported by Replicate)
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, model = "sdxl", provider = "replicate", n = 1 } = await req.json();
    console.log('[API/generate-visual] Received prompt:', prompt, '| Model:', model, '| Provider:', provider);
    if (!prompt) {
      console.error('[API/generate-visual] Missing prompt in request body');
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Explicit support for FLUX.1-dev and other Together image models
    if (provider === "together" && (model === "black-forest-labs/FLUX.1-dev" || model.startsWith('black-forest-labs/FLUX.'))) {
      // Use together-ai SDK for FLUX models
      const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
      if (!TOGETHER_API_KEY) {
        console.error('[API/generate-visual] Missing TOGETHER_API_KEY');
        return NextResponse.json({ error: "Missing Together API key" }, { status: 500 });
      }
      // Dynamically import together-ai for edge compatibility
      const Together = (await import("together-ai")).default;
      const together = new Together({ apiKey: TOGETHER_API_KEY });
      try {
        // Use values from the docs, but allow prompt, n, and steps to be overridden by user input
        const response = await together.images.create({
          model,
          prompt,
          width: 1024,
          height: 768,
          steps: 4, // minimum supported steps for FLUX
          n: 1, // generate only 1 image per request
          response_format: "base64"
        });
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          return NextResponse.json({ images: response.data.map((item: any) => ({ base64: item.base64 })) });
        } else {
          return NextResponse.json({ error: 'Together AI: No image returned', raw: response }, { status: 500 });
        }
      } catch (err: any) {
        console.error('[API/generate-visual] Together AI SDK error:', err);
        return NextResponse.json({ error: err.message || 'Together AI SDK error', raw: err }, { status: 500 });
      }
    }

    // Replicate logic (default)
    const modelVersion = REPLICATE_MODEL_VERSIONS[model] || REPLICATE_MODEL_VERSIONS['sdxl'];
    if (!modelVersion) {
      console.error('[API/generate-visual] Invalid or missing model:', model);
      return NextResponse.json({ error: 'Invalid model selection' }, { status: 400 });
    }
    // Create prediction
    console.log('[API/generate-visual] Sending prediction request to Replicate with version:', modelVersion);
    // Build input object, adding openai_api_key if GPT-Image-1
    const input: any = { prompt };
    if (model === 'gptimage') {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        console.error('[API/generate-visual] Missing OPENAI_API_KEY for GPT-Image-1');
        return NextResponse.json({ error: 'Missing OpenAI API key for GPT-Image-1' }, { status: 500 });
      }
      input.openai_api_key = OPENAI_API_KEY;
    }
    const predictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: modelVersion,
        input
      })
    });
    const predictionStatus = predictionRes.status;
    const predictionText = await predictionRes.text();
    let prediction: any = null;
    try {
      prediction = JSON.parse(predictionText);
    } catch (jsonErr) {
      console.error('[API/generate-visual] Replicate JSON parse error:', jsonErr, '| Response:', predictionText);
      return NextResponse.json({ error: `Replicate JSON parse error: ${String(jsonErr)} | Raw: ${predictionText.slice(0, 500)}` }, { status: 500 });
    }
    console.log('[API/generate-visual] Replicate prediction response:', prediction, '| Status:', predictionStatus, '| Request:', { version: modelVersion, input });
    if (prediction.error) {
      console.error('[API/generate-visual] Replicate returned error:', prediction.error, '| Status:', predictionStatus, '| Raw:', predictionText.slice(0, 500));
      return NextResponse.json({
        error: prediction.error,
        status: predictionStatus,
        raw: predictionText.slice(0, 500),
        request: { version: modelVersion, input }
      }, { status: 500 });
    }
    // Poll for completion
    let status = prediction.status;
    let output = null;
    let error = null;
    let pollCount = 0;
    while (status !== "succeeded" && status !== "failed" && pollCount < 20) {
      await new Promise(res => setTimeout(res, 2000));
      console.log(`[API/generate-visual] Polling Replicate for prediction ${prediction.id}, attempt ${pollCount + 1}`);
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
      });
      const pollStatus = pollRes.status;
      const pollText = await pollRes.text();
      let pollData: any = null;
      try {
        pollData = JSON.parse(pollText);
      } catch (jsonErr) {
        console.error('[API/generate-visual] Replicate poll JSON parse error:', jsonErr, '| Response:', pollText);
        return NextResponse.json({ error: `Replicate poll JSON parse error: ${String(jsonErr)} | Raw: ${pollText.slice(0, 500)}` }, { status: 500 });
      }
      console.log(`[API/generate-visual] Poll response:`, pollData, '| Status:', pollStatus);
      status = pollData.status;
      output = pollData.output;
      error = pollData.error;
      pollCount++;
    }
    if (status === "succeeded" && output && output.length > 0) {
      console.log('[API/generate-visual] Generation succeeded, output:', output);
      return NextResponse.json({ imageUrl: output[0] });
    }
    console.error('[API/generate-visual] Generation failed. Final status:', status, 'Error:', error);
    return NextResponse.json({
      error: error || "Generation failed",
      status,
      request: { model, provider, prompt, n },
    }, { status: 500 });
  } catch (err: any) {
    console.error('[API/generate-visual] Caught error:', err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

