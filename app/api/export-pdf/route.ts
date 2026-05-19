import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, idea, agents } = await req.json();

    // Build simple text-based PDF using basic approach
    const lines: string[] = [];
    lines.push("VIRTUAL BOARDROOM REPORT");
    lines.push("========================");
    lines.push("Topic: " + idea);
    lines.push("Date: " + new Date().toISOString().split("T")[0]);
    lines.push("");

    const phaseMap: Record<string, string> = {
      analysis: "Initial Analysis", discussion: "Panel Discussion",
      iteration: "Cross-Review", decision: "Final Decision", followup: "Follow-up",
    };

    for (const msg of messages) {
      const agent = agents.find((a: any) => a.id === msg.agentId);
      if (!agent) continue;
      lines.push("---");
      lines.push(agent.avatar + " " + agent.name + " - " + agent.role);
      lines.push("Phase: " + (phaseMap[msg.phase] || msg.phase));
      lines.push("");
      lines.push(msg.text);
      lines.push("");
    }

    const content = lines.join("\n");
    const buffer = Buffer.from(content, "utf-8");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="boardroom-report.txt"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
