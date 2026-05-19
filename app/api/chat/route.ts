import { NextRequest, NextResponse } from "next/server";

async function callClaude(system: string, user: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error("Claude API: " + res.status);
  const d = await res.json();
  return d.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
}

async function callOpenAI(system: string, user: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: 2000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error("OpenAI API: " + res.status);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callGemini(system: string, user: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }], generationConfig: { maxOutputTokens: 2000 } }),
  });
  if (!res.ok) throw new Error("Gemini API: " + res.status);
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, userMessage, provider = "claude" } = await req.json();
    if (!systemPrompt || !userMessage) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    let text = "";
    let actualProvider = "claude";

    if (provider === "openai") {
      try { text = await callOpenAI(systemPrompt, userMessage); actualProvider = "openai"; }
      catch { text = await callClaude(systemPrompt, userMessage); actualProvider = "claude"; }
    } else if (provider === "gemini") {
      try { text = await callGemini(systemPrompt, userMessage); actualProvider = "gemini"; }
      catch { text = await callClaude(systemPrompt, userMessage); actualProvider = "claude"; }
    } else {
      text = await callClaude(systemPrompt, userMessage);
      actualProvider = "claude";
    }

    return NextResponse.json({ text, provider: actualProvider });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
