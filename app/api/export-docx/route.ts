import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, idea, agents } = await req.json();

    const {
      Document, Packer, Paragraph, TextRun, HeadingLevel,
      AlignmentType, BorderStyle, PageBreak,
      Header, Footer, PageNumber,
      Table, TableRow, TableCell, WidthType, ShadingType,
    } = require("docx");

    const phaseLabels: Record<string, string> = {
      analysis: "التحليل الأولي | Initial Analysis",
      discussion: "النقاش الجماعي | Panel Discussion",
      iteration: "المراجعة المتبادلة | Cross-Review",
      decision: "القرار النهائي | Final Decision",
      followup: "متابعة النقاش | Follow-up",
    };

    const children: any[] = [];

    // Title
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Virtual Boardroom Report", bold: true, size: 36, font: "Arial" })],
    }));

    // Subtitle
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: idea, size: 22, color: "666666", font: "Arial" })],
    }));

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString("en-US")}`, size: 18, color: "999999", font: "Arial" })],
    }));

    // Separator
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "C9A255" } },
      spacing: { after: 300 },
      children: [],
    }));

    // Messages
    for (const msg of messages) {
      const agent = agents.find((a: any) => a.id === msg.agentId);
      if (!agent) continue;

      const isDecision = msg.phase === "decision";

      // Agent header
      children.push(new Paragraph({
        spacing: { before: 300, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: agent.color.replace("#", "") } },
        children: [
          new TextRun({ text: `${agent.avatar} ${agent.name} — ${agent.role}`, bold: true, size: 24, color: agent.color.replace("#", ""), font: "Arial" }),
        ],
      }));

      // Phase
      children.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: phaseLabels[msg.phase] || msg.phase, size: 16, color: "888888", italics: true, font: "Arial" })],
      }));

      // Text paragraphs
      const paragraphs = msg.text.split("\n").filter((p: string) => p.trim());
      for (const p of paragraphs) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({
            text: p,
            size: isDecision ? 22 : 20,
            font: "Arial",
            bold: isDecision,
          })],
        }));
      }

      // Separator
      children.push(new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
        children: [],
      }));
    }

    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: "Arial", size: 20 } },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Virtual Boardroom Report", size: 16, color: "AAAAAA", font: "Arial" })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 16, color: "AAAAAA", font: "Arial" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "AAAAAA", font: "Arial" }),
              ],
            })],
          }),
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="boardroom-report.docx"`,
      },
    });
  } catch (e: any) {
    console.error("DOCX export error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
