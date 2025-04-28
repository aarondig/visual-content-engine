// Client-side function to call the OpenRouter prompt generation API route
// Now also passes clientBrandGuide and clientTone, and returns summary.
export async function generatePromptFromPost(postContent: string, styleTags?: string[], clientBrandGuide?: any, clientTone?: string): Promise<{ promptPairs: { summary: string, prompt: string }[] | null, error: string | null }> {
  try {
    const response = await fetch("/api/generate-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postContent, styleTags, clientBrandGuide, clientTone })
    });
    const data = await response.json();
    if (data.promptPairs) return { promptPairs: data.promptPairs, error: null };
    return { promptPairs: null, error: data.error || "Prompt generation failed" };
  } catch (err) {
    return { promptPairs: null, error: (err as Error).message };
  }
}
