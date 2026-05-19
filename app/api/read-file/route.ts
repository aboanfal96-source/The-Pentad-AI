import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".docx")) {
      // Use mammoth for DOCX
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      // Basic PDF text extraction using pdf-parse or fallback
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        text = data.text;
      } catch {
        text = `[ملف PDF: ${file.name} — ${(file.size / 1024).toFixed(1)} KB — يرجى التأكد من تثبيت pdf-parse]`;
      }
    } else if (name.endsWith(".json")) {
      text = JSON.stringify(JSON.parse(buffer.toString("utf-8")), null, 2);
    } else {
      text = `[ملف: ${file.name} — النوع: ${file.type} — الحجم: ${(file.size / 1024).toFixed(1)} KB]`;
    }

    // Truncate very long files
    if (text.length > 15000) {
      text = text.slice(0, 15000) + "\n\n... [تم اقتصاص المحتوى — الملف طويل جداً]";
    }

    return NextResponse.json({ text, fileName: file.name, fileSize: file.size });
  } catch (e: any) {
    console.error("File read error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
