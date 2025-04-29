import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324:free"; // DeepSeek Chat v3 free endpoint

export async function POST(req: NextRequest) {
  try {
    const { postContent, styleTags, clientBrandGuide, clientTone } = await req.json();
    if (!postContent) {
      return NextResponse.json({ error: "Missing post content" }, { status: 400 });
    }
    // Compose the dynamic LLM system prompt
    let systemPrompt = `You are an expert prompt engineer for AI image generation models (e.g., Stable Diffusion XL, DALL-E, Midjourney).
Your task: For each LinkedIn post, generate THREE (3) DISTINCT summary/prompt pairs:
- Each pair must have a unique, 3-7 word summary and a much longer, detailed visual prompt.
- Each summary must be visually descriptive enough that someone could imagine the image from the summary alone (e.g., include subject, mood, or style—not just abstract concepts). Vague summaries like 'networked visionaries' are NOT acceptable. Example: 'Minimalist silhouettes on geometric network'.
- Each prompt must be clearly different in concept, composition, or mood from the others.
- Use the client's brand colors and style, prioritizing minimalism.
- The prompt should be visually descriptive, minimal, and reflect the post's personality (e.g., humor, relatability, professionalism) as inferred from the post content.
- Do NOT include any text or watermark in the image.

IMPORTANT: Output ONLY the following format, with NO commentary, NO explanation, and NO extra text. If you do not follow this format, your output will be rejected. DO NOT include any brainstorming, reasoning, or introductory text. Output ONLY the pairs as shown below:

Summary 1: <summary 1>
Prompt 1: <prompt 1>
Summary 2: <summary 2>
Prompt 2: <prompt 2>
Summary 3: <summary 3>
Prompt 3: <prompt 3>

(Repeat: Do NOT include any commentary, brainstorming, or explanation. Output ONLY the summary/prompt pairs as shown above, nothing else.)

Brand colors: ${clientBrandGuide?.colors?.join(', ') || 'none specified'}
Style: ${clientBrandGuide?.style || 'minimalist'}
Tone: ${clientTone || clientBrandGuide?.tone || 'professional'}
`;

    let userPrompt = `Post: ${postContent}`;
    if (styleTags && Array.isArray(styleTags) && styleTags.length > 0) {
      userPrompt += `\nStyle tags: ${styleTags.join(", ")}`;
    }
    userPrompt += "\nGenerate 3 distinct summary/prompt pairs as specified.";

    // Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", response.status, errorText);
      return NextResponse.json({ error: `OpenRouter API error ${response.status}: ${errorText}` }, { status: 500 });
    }
    const data = await response.json();
    if (data.error) {
      console.error("OpenRouter API responded with error:", data.error);
      return NextResponse.json({ error: data.error }, { status: 500 });
    }
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      // Fallback: use reasoning field if present
      content = data.choices?.[0]?.message?.reasoning?.trim();
    }
    // Always log the raw LLM output for debugging
    console.log("[LLM Raw Output]", content);
    if (!content) {
      console.error("No prompt generated. Full response:", JSON.stringify(data));
      return NextResponse.json({ error: "No prompt generated", fullResponse: data }, { status: 500 });
    }
    // Robustly parse the LLM output for Summary and Prompt (order-independent, ignore extra text)
    function extractPromptPairs(text: string) {
      // Remove markdown bold/italic and trim whitespace
      text = text.replace(/[*_]+/g, '').trim();
      // Extract all summaries and prompts, then pair strictly by order (ignore numbering)
      const summaryRegex = /Summary\s*([1-3])?\s*:\s*["“]?([^\n"]+)["”]?/gi;
      const promptRegex = /Prompt\s*([1-3])?\s*:\s*["“]?([\s\S]*?)(?=\n\S|$)/gi;
      const summaries: string[] = [];
      const prompts: string[] = [];
      let match;
      while ((match = summaryRegex.exec(text)) !== null) {
        summaries.push(match[2].trim());
      }
      while ((match = promptRegex.exec(text)) !== null) {
        prompts.push(match[2].trim());
      }
      // Pair strictly by order
      const pairs = [];
      for (let i = 0; i < Math.min(summaries.length, prompts.length); i++) {
        if (summaries[i] && prompts[i]) {
          pairs.push({ summary: summaries[i], prompt: prompts[i] });
        }
      }
      return pairs;
    }
    const pairs = extractPromptPairs(content);
    if (!pairs || pairs.length === 0) {
      // Log the raw output for debugging
      console.error("Prompt extraction failed. Raw output:", content);
      return NextResponse.json({ error: "Could not extract any summary/prompt pairs from model output.", raw: content }, { status: 500 });
    }
    let warning = undefined;
    if (pairs.length < 3) {
      warning = `Only ${pairs.length} summary/prompt pair(s) were extracted. Please refine your prompt or try again.`;
    }
    return NextResponse.json({ promptPairs: pairs, warning });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
