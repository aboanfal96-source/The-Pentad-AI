import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Header, Footer, PageNumber,
} from "docx";

export async function POST(req: NextRequest) {
  try {
    const { messages, idea, agents } = await req.json();

    const phaseMap: Record<string, string> = {
      analysis: "Initial Analysis", discussion: "Panel Discussion",
      iteration: "Cross-Review", decision: "Final Decision", followup: "Follow-up",
    };

    const children: any[] = [];

    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Virtual Boardroom Report", bold: true, size: 36, font: "Arial" })],
    }));

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: idea, size: 22, color: "666666", font: "Arial" })],
    }));

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "Date: " + new Date().toISOString().split("T")[0], size: 18, color: "999999", font: "Arial" })],
    }));

    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "C9A255" } },
      spacing: { after: 300 },
      children: [],
    }));

    for (const msg of messages) {
      const agent = agents.find((a: any) => a.id === msg.agentId);
      if (!agent) continue;

      children.push(new Paragraph({
        spacing: { before: 300, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: (agent.color || "#333333").replace("#", "") } },
        children: [
          new TextRun({ text: agent.avatar + " " + agent.name + " — " + agent.role, bold: true, size: 24, color: (agent.color || "#333333").replace("#", ""), font: "Arial" }),
        ],
      }));

      children.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: phaseMap[msg.phase] || msg.phase, size: 16, color: "888888", italics: true, font: "Arial" })],
      }));

      const paragraphs = msg.text.split("\n").filter((p: string) => p.trim());
      for (const p of paragraphs) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: p, size: 20, font: "Arial" })],
        }));
      }

      children.push(new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
        children: [],
      }));
    }

    const doc = new Document({
      styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
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
        "Content-Disposition": 'attachment; filename="boardroom-report.docx"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
