// Replicate image generation service
// IMPORTANT: Move your API token to an environment variable before production!

// IMPORTANT: Set REPLICATE_API_TOKEN in your .env.local (never commit secrets!)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) throw new Error('Missing REPLICATE_API_TOKEN environment variable');
const REPLICATE_MODEL = "stability-ai/sdxl";

export async function generateImageFromPrompt(prompt: string): Promise<{ imageUrl: string | null, error: string | null }> {
  try {
    const response = await fetch("/api/generate-visual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (data.imageUrl) return { imageUrl: data.imageUrl, error: null };
    return { imageUrl: null, error: data.error || "Generation failed" };
  } catch (err) {
    return { imageUrl: null, error: (err as Error).message };
  }
}

// Example prompt refactorer (replace with LLM call later)
export function postToVisualPrompt(post: string): string {
  return `Create a visually engaging image that represents the following post: ${post}`;
}
