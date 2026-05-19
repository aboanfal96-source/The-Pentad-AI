import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `ابحث عن: ${query}\nقدم أهم 5 نتائج مع ملخص لكل نتيجة بالعربية.` }] }],
            generationConfig: { maxOutputTokens: 1000 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ results: data.candidates?.[0]?.content?.parts?.[0]?.text || "", source: "gemini" });
      }
    }

    // Fallback to Claude
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: "No keys" }, { status: 500 });
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 800,
        messages: [{ role: "user", content: `ملخص بحثي سريع عن: "${query}"\nأهم الحقائق والإحصائيات. اكتب بالعربية.` }],
      }),
    });
    const data = await res.json();
    return NextResponse.json({ results: data.content?.[0]?.text || "", source: "claude" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
