import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: Set REPLICATE_API_TOKEN in your .env.local (never commit secrets!)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN environment variable');
const REPLICATE_MODEL_VERSION = "db21e45a3c8b4b5b8c2a2c7b4a7e7f2b1a6e5b5e2b2b4c5b8c5b8e5e5b5e7f2"; // SDXL v1.0

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    // Create prediction
    const predictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: { prompt }
      })
    });
    const prediction = await predictionRes.json();
    if (prediction.error) {
      return NextResponse.json({ error: prediction.error }, { status: 500 });
    }
    // Poll for completion
    let status = prediction.status;
    let output = null;
    let error = null;
    let pollCount = 0;
    while (status !== "succeeded" && status !== "failed" && pollCount < 20) {
      await new Promise(res => setTimeout(res, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
      });
      const pollData = await pollRes.json();
      status = pollData.status;
      output = pollData.output;
      error = pollData.error;
      pollCount++;
    }
    if (status === "succeeded" && output && output.length > 0) {
      return NextResponse.json({ imageUrl: output[0] });
    }
    return NextResponse.json({ error: error || "Generation failed" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
