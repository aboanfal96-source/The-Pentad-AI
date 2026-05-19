import { NextRequest, NextResponse } from "next/server";

async function callClaude(system: string, user: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Claude: ${res.status} ${await res.text()}`);
  const d = await res.json();
  return d.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
}

async function callOpenAI(system: string, user: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: 2000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callGemini(system: string, user: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }], generationConfig: { maxOutputTokens: 2000 } }),
  });
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function route(provider: string, system: string, user: string): Promise<{ text: string; provider: string }> {
  const attempts: { fn: () => Promise<string>; name: string }[] = [];
  if (provider === "openai") attempts.push({ fn: () => callOpenAI(system, user), name: "openai" });
  else if (provider === "gemini") attempts.push({ fn: () => callGemini(system, user), name: "gemini" });
  attempts.push({ fn: () => callClaude(system, user), name: "claude" });

  for (const a of attempts) {
    try {
      return { text: await a.fn(), provider: a.name };
    } catch (e: any) {
      if (e.message === "NO_KEY" || attempts.indexOf(a) < attempts.length - 1) continue;
      throw e;
    }
  }
  throw new Error("All providers failed");
}

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, userMessage, provider = "claude" } = await req.json();
    if (!systemPrompt || !userMessage) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    const { text, provider: actual } = await route(provider, systemPrompt, userMessage);
    return NextResponse.json({ text, provider: actual });
  } catch (e: any) {
    console.error("Chat API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
