import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: Set REPLICATE_API_TOKEN in your .env.local (never commit secrets!)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN environment variable');
const REPLICATE_MODEL_VERSIONS: Record<string, string> = {
  sdxl: "a9758cb8c9e6d7c3a4b8e4b9a2e6c3d7e8b4c2a1e8e2b1c7d8e6b7a1c9e7b3", // Example SDXL version, replace with actual
  sd15: "21e1b1a4-4c87-4b8b-8c6a-cb6e3b7c6c6b", // Example SD 1.5 version, replace with actual
  dreamshaper: "e4b7c1c6-7e4e-4b8c-9b0a-7b3c6e4b7c1c", // Example DreamShaper version, replace with actual
  gptimage: "openai/gpt-image-1" // Use as-is for OpenAI's model (if supported by Replicate)
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, model = "sdxl" } = await req.json();
    console.log('[API/generate-visual] Received prompt:', prompt, '| Model:', model);
    if (!prompt) {
      console.error('[API/generate-visual] Missing prompt in request body');
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    // Model version selection
    const modelVersion = REPLICATE_MODEL_VERSIONS[model] || REPLICATE_MODEL_VERSIONS['sdxl'];
    if (!modelVersion) {
      console.error('[API/generate-visual] Invalid or missing model:', model);
      return NextResponse.json({ error: 'Invalid model selection' }, { status: 400 });
    }
    // Create prediction
    console.log('[API/generate-visual] Sending prediction request to Replicate with version:', modelVersion);
    const predictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: modelVersion,
        input: { prompt }
      })
    });
    const prediction = await predictionRes.json();
    console.log('[API/generate-visual] Replicate prediction response:', prediction);
    if (prediction.error) {
      console.error('[API/generate-visual] Replicate returned error:', prediction.error);
      return NextResponse.json({ error: prediction.error }, { status: 500 });
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
      const pollData = await pollRes.json();
      console.log(`[API/generate-visual] Poll response:`, pollData);
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
    return NextResponse.json({ error: error || "Generation failed" }, { status: 500 });
  } catch (err: any) {
    console.error('[API/generate-visual] Caught error:', err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

