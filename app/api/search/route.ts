import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "ابحث عن: " + query + "\nقدم أهم 5 نتائج مع ملخص بالعربية." }] }],
              generationConfig: { maxOutputTokens: 1000 },
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ results: data.candidates?.[0]?.content?.parts?.[0]?.text || "" });
        }
      } catch {}
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ results: "" });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 800,
        messages: [{ role: "user", content: "ملخص بحثي عن: " + query + "\nاكتب بالعربية." }],
      }),
    });
    const data = await res.json();
    return NextResponse.json({ results: data.content?.[0]?.text || "" });
  } catch {
    return NextResponse.json({ results: "" });
  }
}
