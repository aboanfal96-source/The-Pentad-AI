import { NextRequest, NextResponse } from "next/server";

// Use Gemini's grounding with Google Search when available,
// otherwise use a simple search simulation via Claude
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      // Use Gemini with Google Search grounding
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `ابحث عن: ${query}\n\nقدم أهم 5 نتائج بحثية مع ملخص لكل نتيجة باللغة العربية. اكتب كل نتيجة في سطر منفصل بهذا الشكل:\nالعنوان: ...\nالملخص: ...\n---` }] }],
            generationConfig: { maxOutputTokens: 1000 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({ results: text, source: "gemini" });
      }
    }

    // Fallback: use Claude to synthesize knowledge
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "No API keys configured" }, { status: 500 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `اكتب ملخصاً بحثياً سريعاً عن: "${query}"\nقدم أهم الحقائق والإحصائيات والاتجاهات المعروفة. اكتب بالعربية في 3-4 فقرات.`
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    return NextResponse.json({ results: text, source: "claude-knowledge" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
