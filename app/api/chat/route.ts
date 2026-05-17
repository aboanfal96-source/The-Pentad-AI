import { NextRequest, NextResponse } from "next/server";

// ─── Provider: Anthropic Claude ───
async function callClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n") || "";
}

// ─── Provider: OpenAI (ChatGPT) ───
async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_OPENAI_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Provider: Google Gemini ───
async function callGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_GEMINI_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1500 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Smart Router with Fallback ───
async function routeCall(
  provider: string,
  system: string,
  user: string
): Promise<{ text: string; actualProvider: string }> {
  // Try the requested provider first, fall back to Claude
  const attempts: { fn: () => Promise<string>; name: string }[] = [];

  if (provider === "openai") {
    attempts.push({ fn: () => callOpenAI(system, user), name: "openai" });
  } else if (provider === "gemini") {
    attempts.push({ fn: () => callGemini(system, user), name: "gemini" });
  }
  // Claude is always the fallback
  attempts.push({ fn: () => callClaude(system, user), name: "claude" });

  for (const attempt of attempts) {
    try {
      const text = await attempt.fn();
      return { text, actualProvider: attempt.name };
    } catch (e: any) {
      // If it's a missing key error, skip to fallback silently
      if (e.message?.includes("NO_OPENAI_KEY") || e.message?.includes("NO_GEMINI_KEY")) {
        continue;
      }
      // If it's a real API error and we have more attempts, try next
      if (attempts.indexOf(attempt) < attempts.length - 1) {
        console.warn(`${attempt.name} failed, falling back:`, e.message);
        continue;
      }
      throw e;
    }
  }

  throw new Error("All providers failed");
}

// ─── API Route Handler ───
export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, userMessage, provider = "claude" } = await req.json();

    if (!systemPrompt || !userMessage) {
      return NextResponse.json(
        { error: "systemPrompt and userMessage are required" },
        { status: 400 }
      );
    }

    const { text, actualProvider } = await routeCall(provider, systemPrompt, userMessage);

    return NextResponse.json({ text, provider: actualProvider });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
