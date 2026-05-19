import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, idea, agents } = await req.json();
    const PDFDocument = require("pdfkit");

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 60, lang: "ar" });

    doc.on("data", (c: Buffer) => chunks.push(c));

    // Register Arabic-capable font (use Noto if available, else Helvetica)
    // PDFKit doesn't natively handle RTL well, so we provide a basic layout

    // Title
    doc.fontSize(22).fillColor("#1a1a3a")
      .text("Virtual Boardroom - Final Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#666")
      .text(`Idea: ${idea}`, { align: "center" });
    doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, { align: "center" });
    doc.moveDown(1);

    // Separator
    doc.strokeColor("#c9a255").lineWidth(1)
      .moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(1);

    // Messages
    const phaseLabels: Record<string, string> = {
      analysis: "Initial Analysis",
      discussion: "Panel Discussion",
      iteration: "Cross-Review",
      decision: "Final Decision",
      followup: "Follow-up Discussion",
    };

    for (const msg of messages) {
      const agent = agents.find((a: any) => a.id === msg.agentId);
      if (!agent) continue;

      // Agent header
      doc.fontSize(12).fillColor(agent.color)
        .text(`${agent.avatar} ${agent.name} — ${agent.role}`, { continued: false });
      doc.fontSize(9).fillColor("#888")
        .text(`Phase: ${phaseLabels[msg.phase] || msg.phase}`);
      doc.moveDown(0.3);

      // Message text (handling Arabic as LTR fallback since PDFKit has limited RTL)
      doc.fontSize(10).fillColor("#333")
        .text(msg.text, { align: "left", lineGap: 4 });
      doc.moveDown(0.5);

      // Separator
      doc.strokeColor("#ddd").lineWidth(0.5)
        .moveTo(60, doc.y).lineTo(535, doc.y).stroke();
      doc.moveDown(0.5);

      // Page break check
      if (doc.y > 700) doc.addPage();
    }

    doc.end();

    await new Promise<void>((resolve) => doc.on("end", resolve));
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="boardroom-report.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("PDF export error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
