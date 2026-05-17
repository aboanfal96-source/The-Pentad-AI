"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AGENTS, PHASES, PHASE_LABELS,
  generateId,
  type Agent, type BoardMessage, type BoardSession,
} from "@/lib/agents";

/* ═══════════════════════════════════════
   API Helper
   ═══════════════════════════════════════ */

async function callAgent(
  systemPrompt: string,
  userMessage: string,
  provider: string = "claude"
): Promise<{ text: string; provider: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMessage, provider }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { text: data.text, provider: data.provider };
}

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return data.results || "";
  } catch {
    return "";
  }
}

/* ═══════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════ */

function Dots({ color }: { color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: "50%", background: color,
            display: "inline-block",
            animation: `pulseDot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function Avatar({ agent, size = 34, active = false }: { agent: Agent; size?: number; active?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `linear-gradient(145deg, ${agent.color}28, ${agent.color}0a)`,
      border: `1.5px solid ${agent.color}${active ? "88" : "33"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.48, flexShrink: 0,
      animation: active ? "breathe 2s ease infinite" : "none",
      transition: "all 0.3s",
    }}>
      {agent.avatar}
    </div>
  );
}

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;
  const map: Record<string, { label: string; color: string }> = {
    claude: { label: "Claude", color: "#c9a255" },
    openai: { label: "GPT-4o", color: "#44aa77" },
    gemini: { label: "Gemini", color: "#4488cc" },
    "claude-knowledge": { label: "Claude", color: "#c9a255" },
  };
  const p = map[provider] || map.claude;
  return (
    <span style={{
      fontSize: 9, padding: "1px 6px", borderRadius: 6,
      background: `${p.color}18`, color: `${p.color}cc`,
      border: `1px solid ${p.color}22`, fontWeight: 600,
    }}>
      {p.label}
    </span>
  );
}

function PhaseTimeline({ current }: { current: string }) {
  const idx = PHASES.findIndex((p) => p.id === current);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {PHASES.map((p, i) => {
        const done = i < idx;
        const active = i === idx;
        const clr = active ? "var(--gold)" : done ? "var(--green)" : "var(--text-ghost)";
        return (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "6px 8px",
            borderRadius: 8,
            background: active ? "var(--gold)0a" : "transparent",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: done ? `var(--green)22` : active ? `var(--gold)18` : "var(--bg-card)",
              border: `1.5px solid ${active ? "var(--gold)44" : done ? "var(--green)44" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: clr, fontWeight: 700,
              transition: "all 0.3s",
            }}>
              {done ? "✓" : p.icon}
            </div>
            <span style={{
              fontSize: 11, color: clr, fontWeight: active ? 700 : 400,
              transition: "all 0.3s",
            }}>
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MessageCard({ msg, actualProviders }: { msg: BoardMessage; actualProviders: Record<string, string> }) {
  const agent = AGENTS.find((a) => a.id === msg.agentId)!;
  const isDecision = msg.phase === "decision";

  return (
    <div style={{ animation: "fadeUp 0.4s ease both", marginBottom: 16 }}>
      <div style={{
        background: isDecision
          ? `linear-gradient(135deg, var(--gold)08, var(--green)06)`
          : "var(--bg-card)",
        border: `1px solid ${isDecision ? "var(--gold)33" : "var(--border)"}`,
        borderRight: `3px solid ${agent.color}`,
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        transition: "border-color 0.3s",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar agent={agent} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ color: agent.color, fontWeight: 700, fontSize: 13 }}>{agent.name}</span>
              <ProviderBadge provider={actualProviders[msg.id]} />
              {isDecision && (
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: 10,
                  background: "var(--gold)18", color: "var(--gold)",
                  fontWeight: 700,
                }}>
                  📜 القرار النهائي
                </span>
              )}
            </div>
            <div style={{ color: "var(--text-ghost)", fontSize: 10 }}>
              {agent.role} · {PHASE_LABELS[msg.phase] || ""}
            </div>
          </div>
        </div>
        {/* Body */}
        <div
          className="msg-body"
          style={{
            color: isDecision ? "#d8d0c0" : "var(--text-main)",
            fontSize: 13.5, lineHeight: 2,
            whiteSpace: "pre-wrap",
          }}
          dangerouslySetInnerHTML={{
            __html: formatMessage(msg.text),
          }}
        />
      </div>
    </div>
  );
}

// Simple formatter: handles code blocks
function formatMessage(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function ExampleChips({ onSelect }: { onSelect: (idea: string) => void }) {
  const examples = [
    "إطلاق منصة تداول عملات رقمية متكاملة",
    "تطبيق توصيل طعام صحي بالاشتراك الشهري",
    "منصة تعليمية بالذكاء الاصطناعي للأطفال",
    "SaaS لإدارة المطاعم والمخزون",
  ];
  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap",
      justifyContent: "center", marginTop: 20,
    }}>
      {examples.map((ex, i) => (
        <button
          key={i}
          onClick={() => onSelect(ex)}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "6px 14px", color: "var(--text-dim)",
            fontSize: 11, fontFamily: "inherit", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "var(--gold)44";
            e.currentTarget.style.color = "var(--gold-soft)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-dim)";
          }}
        >
          {ex}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export default function Home() {
  const [idea, setIdea] = useState("");
  const [phase, setPhase] = useState("idle");
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actualProviders, setActualProviders] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<{ id: string; idea: string; time: number }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, activeAgent]);

  const addMsg = useCallback((agentId: string, text: string, msgPhase: string, provider?: string) => {
    const id = generateId();
    setMessages((prev) => [...prev, { id, agentId, text, phase: msgPhase, timestamp: Date.now() }]);
    if (provider) {
      setActualProviders((prev) => ({ ...prev, [id]: provider }));
    }
    return id;
  }, []);

  /* ─── The Boardroom Engine ─── */
  const runBoardroom = async () => {
    if (!idea.trim() || isRunning) return;
    setIsRunning(true);
    setMessages([]);
    setError("");
    setActualProviders({});
    setSidebarOpen(false);

    const currentIdea = idea.trim();

    try {
      // ═══ PHASE 1: رئيس المجلس يحلل ═══
      setPhase("analysis");
      setActiveAgent("claude");

      const claudeAgent = AGENTS[0];
      const r1 = await callAgent(
        claudeAgent.systemPrompt,
        `الفكرة المطروحة أمام المجلس: "${currentIdea}"\n\nبصفتك رئيس المجلس، حلل هذه الفكرة بعمق. حدد المحاور الأساسية التي يجب أن يناقشها كل عضو. اطرح الأسئلة الجوهرية التي يجب الإجابة عليها.`,
        claudeAgent.provider
      );
      addMsg("claude", r1.text, "analysis", r1.provider);

      // ═══ PHASE 2: النقاش الجماعي ═══
      setPhase("discussion");
      const panelResults: Record<string, string> = {};

      // جيمناي يبحث أولاً
      setActiveAgent("gemini");
      const searchData = await searchWeb(`${currentIdea} market size trends statistics`);
      const gemAgent = AGENTS[1];
      const r2 = await callAgent(
        gemAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nتحليل رئيس المجلس: ${r1.text}\n\n${searchData ? `بيانات بحثية متاحة:\n${searchData}\n\n` : ""}قدم تحليلك البحثي المدعوم بالأرقام والحقائق عن هذه الفكرة. حجم السوق، المنافسون، الاتجاهات.`,
        gemAgent.provider
      );
      panelResults["gemini"] = r2.text;
      addMsg("gemini", r2.text, "discussion", r2.provider);

      // جي بي تي يبتكر
      setActiveAgent("chatgpt");
      const gptAgent = AGENTS[2];
      const r3 = await callAgent(
        gptAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nتحليل رئيس المجلس: ${r1.text}\n\nبيانات السوق من جيمناي: ${r2.text.slice(0, 500)}\n\nقدم رؤيتك الإبداعية. اقترح حلولاً مبتكرة، نماذج أعمال غير تقليدية، واستراتيجيات تسويقية.`,
        gptAgent.provider
      );
      panelResults["chatgpt"] = r3.text;
      addMsg("chatgpt", r3.text, "discussion", r3.provider);

      // مانوس يبني الخطة التقنية
      setActiveAgent("manus");
      const manusAgent = AGENTS[3];
      const r4 = await callAgent(
        manusAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nتحليل رئيس المجلس: ${r1.text}\n\nالمتطلبات الإبداعية من جي بي تي: ${r3.text.slice(0, 500)}\n\nصمم البنية التقنية الكاملة. اختر Tech Stack مناسب. قدم أمثلة كود إن لزم. ضع خارطة طريق تقنية بالمراحل.`,
        manusAgent.provider
      );
      panelResults["manus"] = r4.text;
      addMsg("manus", r4.text, "discussion", r4.provider);

      // كيمي ينقد
      setActiveAgent("kimi");
      const kimiAgent = AGENTS[4];
      const r5 = await callAgent(
        kimiAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nملخص ما طُرح:\n- رئيس المجلس: ${r1.text.slice(0, 300)}\n- البحث والبيانات: ${r2.text.slice(0, 300)}\n- الابتكار: ${r3.text.slice(0, 300)}\n- التقنية: ${r4.text.slice(0, 300)}\n\nمارس دورك كمحامي الشيطان. اكشف كل ثغرة. تحدّ الافتراضات. ما المخاطر الحقيقية؟ هل الأرقام واقعية؟`,
        kimiAgent.provider
      );
      panelResults["kimi"] = r5.text;
      addMsg("kimi", r5.text, "discussion", r5.provider);

      // ═══ PHASE 3: المراجعة المتبادلة ═══
      setPhase("iteration");

      // جيمناي يرد على نقد كيمي
      setActiveAgent("gemini");
      const r6 = await callAgent(
        gemAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nانتقادات كيمي (محامي الشيطان): ${r5.text}\n\nالمقترحات التقنية من مانوس: ${r4.text.slice(0, 400)}\n\nرد على الانتقادات من منظورك البحثي. هل كيمي محق؟ قدم أدلة تدعم أو تنقض نقاطه.`,
        gemAgent.provider
      );
      addMsg("gemini", r6.text, "iteration", r6.provider);

      // جي بي تي يطور بناء على النقد
      setActiveAgent("chatgpt");
      const r7 = await callAgent(
        gptAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nانتقادات كيمي: ${r5.text}\n\nرد جيمناي: ${r6.text.slice(0, 400)}\n\nبناء على النقد، طوّر مقترحاتك. كيف تعالج الثغرات المكتشفة؟ اقترح حلولاً محسنة.`,
        gptAgent.provider
      );
      addMsg("chatgpt", r7.text, "iteration", r7.provider);

      // مانوس يحدّث الخطة التقنية
      setActiveAgent("manus");
      const r8 = await callAgent(
        manusAgent.systemPrompt,
        `الفكرة: "${currentIdea}"\n\nالانتقادات التقنية: ${r5.text.slice(0, 300)}\n\nالتحسينات الإبداعية: ${r7.text.slice(0, 300)}\n\nحدّث خطتك التقنية بناء على المراجعة. أضف حلولاً للمخاطر التقنية المكتشفة. قدم كوداً إن لزم.`,
        manusAgent.provider
      );
      addMsg("manus", r8.text, "iteration", r8.provider);

      // ═══ PHASE 4: القرار النهائي ═══
      setPhase("decision");
      setActiveAgent("claude");

      const finalPrompt = `أنت رئيس مجلس الإدارة الافتراضي. استمعت لكل الآراء والمراجعات. الآن أصدر القرار النهائي الشامل.

اكتب تقريراً نهائياً يتضمن:

1) الملخص التنفيذي: خلاصة الفكرة وتقييمها العام بجملتين أو ثلاث

2) تحليل السوق والفرصة: أهم ما قدمه جيمناي من بيانات وأرقام

3) الاستراتيجية الإبداعية: أفضل مقترحات جي بي تي للتسويق ونموذج العمل

4) الخطة التقنية: ملخص البنية والمراحل من مانوس

5) المخاطر والتحديات: أهم تحفظات كيمي وكيف نعالجها

6) القرار: هل نمضي قدماً أم لا؟ ولماذا؟

7) خطة العمل: أول 3 خطوات تنفيذية فورية مع الجدول الزمني

اكتب بالعربية بأسلوب احترافي. استخدم الترقيم لا markdown. كن حاسماً في القرار.`;

      const finalMsg = `الفكرة: "${currentIdea}"

تحليلي الأولي: ${r1.text}

آراء الأعضاء (الجولة الأولى):
— جيمناي (البحث): ${r2.text}
— جي بي تي (الابتكار): ${r3.text}
— مانوس (التقنية): ${r4.text}
— كيمي (النقد): ${r5.text}

المراجعة المتبادلة:
— جيمناي يرد: ${r6.text}
— جي بي تي يطور: ${r7.text}
— مانوس يحدّث: ${r8.text}

بناء على كل ما سبق، أصدر القرار النهائي.`;

      const rFinal = await callAgent(finalPrompt, finalMsg, "claude");
      addMsg("claude", rFinal.text, "decision", rFinal.provider);

      setPhase("complete");
      setSessions((prev) => [
        { id: generateId(), idea: currentIdea, time: Date.now() },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع");
      console.error(e);
    }

    setActiveAgent(null);
    setIsRunning(false);
  };

  /* ─── Export as text ─── */
  const exportSession = () => {
    const lines = [
      `🏛️ مجلس الإدارة الافتراضي — تقرير الجلسة`,
      `الفكرة: ${idea}`,
      `التاريخ: ${new Date().toLocaleDateString("ar-SA")}`,
      `${"═".repeat(50)}`,
      "",
    ];
    messages.forEach((m) => {
      const agent = AGENTS.find((a) => a.id === m.agentId)!;
      lines.push(`【 ${agent.name} — ${agent.role} 】 (${PHASE_LABELS[m.phase] || m.phase})`);
      lines.push(m.text);
      lines.push("");
      lines.push("─".repeat(40));
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boardroom-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const msgCount = (id: string) => messages.filter((m) => m.agentId === id).length;

  /* ─── Sidebar content (shared between desktop and mobile) ─── */
  const SidebarContent = () => (
    <div style={{ padding: 16 }}>
      {/* Agents */}
      <div style={{
        fontSize: 10, color: "var(--text-ghost)", fontWeight: 700,
        marginBottom: 10, letterSpacing: 0.5,
        textTransform: "uppercase",
      }}>
        أعضاء المجلس
      </div>
      {AGENTS.map((a) => {
        const active = activeAgent === a.id;
        const count = msgCount(a.id);
        return (
          <div key={a.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", borderRadius: 10, marginBottom: 4,
            background: active ? `${a.color}0c` : "transparent",
            border: `1px solid ${active ? a.color + "33" : "transparent"}`,
            transition: "all 0.3s",
          }}>
            <Avatar agent={a} size={32} active={active} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: active ? a.color : "var(--text-bright)",
                fontWeight: 700, fontSize: 12,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {a.name}
                {active && <Dots color={a.color} />}
              </div>
              <div style={{ color: "var(--text-ghost)", fontSize: 9.5 }}>{a.role}</div>
            </div>
            {count > 0 && (
              <span style={{
                background: a.color, color: "var(--bg-void)",
                borderRadius: 7, padding: "1px 7px",
                fontSize: 10, fontWeight: 800,
              }}>
                {count}
              </span>
            )}
          </div>
        );
      })}

      {/* Phase timeline */}
      <div style={{
        borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14,
      }}>
        <div style={{
          fontSize: 10, color: "var(--text-ghost)", fontWeight: 700,
          marginBottom: 10, letterSpacing: 0.5,
        }}>
          مراحل الجلسة
        </div>
        <PhaseTimeline current={phase} />
      </div>

      {/* Provider status */}
      <div style={{
        borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14,
      }}>
        <div style={{
          fontSize: 10, color: "var(--text-ghost)", fontWeight: 700,
          marginBottom: 10, letterSpacing: 0.5,
        }}>
          النماذج المتصلة
        </div>
        {[
          { name: "Claude (Anthropic)", color: "var(--gold)", always: true },
          { name: "GPT-4o (OpenAI)", color: "var(--green)", always: false },
          { name: "Gemini (Google)", color: "var(--blue)", always: false },
        ].map((p) => {
          const usedProviders = Object.values(actualProviders);
          const isActive = p.always || usedProviders.includes(p.name.split(" ")[0].toLowerCase());
          return (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 0", fontSize: 11, color: "var(--text-dim)",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: p.always ? p.color : "var(--text-ghost)",
              }} />
              <span>{p.name}</span>
            </div>
          );
        })}
        <p style={{
          fontSize: 9.5, color: "var(--text-ghost)", marginTop: 8, lineHeight: 1.7,
        }}>
          أضف مفاتيح OpenAI و Gemini في إعدادات Vercel لتفعيل التنوع الحقيقي بين النماذج
        </p>
      </div>

      {/* Actions */}
      {messages.length > 0 && phase === "complete" && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14 }}>
          <button
            onClick={exportSession}
            style={{
              width: "100%", padding: "10px", borderRadius: 10,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "var(--text-dim)", fontSize: 12, fontFamily: "inherit",
              cursor: "pointer", fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--gold)44";
              e.currentTarget.style.color = "var(--gold)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            📥 تصدير التقرير
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ═══ Header ═══ */}
      <header style={{
        padding: "12px 18px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-base)",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <button
          className="mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: "none", border: "none", color: "var(--text-dim)",
            fontSize: 20, cursor: "pointer", padding: 4,
            display: "none", alignItems: "center",
          }}
        >
          ☰
        </button>

        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "linear-gradient(135deg, var(--gold)33, var(--blue)22, var(--green)22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          🏛️
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="heading" style={{
            fontSize: 16, fontWeight: 800, color: "#e8dcc8",
            letterSpacing: -0.3,
          }}>
            مجلس الإدارة الافتراضي
          </h1>
          <p style={{ fontSize: 10, color: "var(--text-ghost)", fontWeight: 400 }}>
            Virtual Boardroom Pro · Multi-Model AI
          </p>
        </div>

        {isRunning && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--gold)0c", border: "1px solid var(--gold)22",
            borderRadius: 20, padding: "5px 14px",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              border: "2px solid var(--gold)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>
              جارٍ النقاش
            </span>
          </div>
        )}
      </header>

      {/* ═══ Body ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Overlay for mobile */}
        <div
          className={`overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Desktop sidebar */}
        <aside
          className="desktop-sidebar"
          style={{
            width: 240, minWidth: 240,
            borderLeft: "1px solid var(--border)",
            background: "var(--bg-base)",
            overflowY: "auto", flexShrink: 0,
          }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        <aside
          className={`sidebar-mobile ${sidebarOpen ? "open" : ""}`}
          style={{
            width: 280,
            background: "var(--bg-base)",
            overflowY: "auto",
          }}
        >
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-bright)" }}>
              المجلس
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "none", border: "none", color: "var(--text-dim)",
                fontSize: 20, cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* ─── Chat ─── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px" }}>

            {/* Empty state */}
            {messages.length === 0 && !isRunning && (
              <div style={{
                textAlign: "center", paddingTop: "12vh",
                animation: "fadeUp 0.6s ease",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
                  background: "linear-gradient(135deg, var(--gold)20, var(--blue)15, var(--green)10)",
                  border: "1px solid var(--gold)22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 34,
                }}>
                  🏛️
                </div>
                <h2 className="heading" style={{
                  fontSize: 20, fontWeight: 800, color: "var(--text-bright)",
                  marginBottom: 8,
                }}>
                  مجلس الإدارة جاهز
                </h2>
                <p style={{
                  fontSize: 13, color: "var(--text-ghost)",
                  maxWidth: 380, margin: "0 auto", lineHeight: 1.9,
                }}>
                  اطرح فكرتك وسيتناقش خمسة نماذج ذكاء اصطناعي لتحليلها
                  من كل زاوية وإصدار قرار نهائي مدعوم بالأدلة
                </p>
                <ExampleChips onSelect={(ex) => setIdea(ex)} />
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageCard key={msg.id} msg={msg} actualProviders={actualProviders} />
            ))}

            {/* Active typing */}
            {activeAgent && isRunning && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 4px", animation: "fadeUp 0.3s ease",
              }}>
                <Avatar agent={AGENTS.find((a) => a.id === activeAgent)!} size={28} active />
                <span style={{
                  color: AGENTS.find((a) => a.id === activeAgent)!.color,
                  fontWeight: 700, fontSize: 12,
                }}>
                  {AGENTS.find((a) => a.id === activeAgent)!.name}
                </span>
                <Dots color={AGENTS.find((a) => a.id === activeAgent)!.color} />
                <span style={{ color: "var(--text-ghost)", fontSize: 11 }}>
                  يكتب الآن...
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: "var(--red)0c", border: "1px solid var(--red)33",
                borderRadius: 12, padding: "14px 16px",
                color: "#e89898", fontSize: 13, marginTop: 8,
                animation: "fadeUp 0.3s ease",
              }}>
                ⚠️ خطأ: {error}
                <div style={{ fontSize: 11, color: "var(--text-ghost)", marginTop: 6 }}>
                  تأكد من إضافة ANTHROPIC_API_KEY في متغيرات البيئة
                </div>
              </div>
            )}
          </div>

          {/* ─── Input ─── */}
          <div style={{
            padding: "12px 18px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-base)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="اكتب فكرتك هنا..."
                disabled={isRunning}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runBoardroom(); }
                }}
                rows={2}
                style={{
                  flex: 1, background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px", color: "var(--text-bright)",
                  fontSize: 14, fontFamily: "inherit", resize: "none",
                  lineHeight: 1.7, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--gold)44")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                onClick={runBoardroom}
                disabled={isRunning || !idea.trim()}
                style={{
                  background: isRunning || !idea.trim()
                    ? "var(--bg-card)"
                    : "linear-gradient(135deg, var(--gold), #a88838)",
                  color: isRunning || !idea.trim() ? "var(--text-ghost)" : "var(--bg-void)",
                  border: `1px solid ${isRunning || !idea.trim() ? "var(--border)" : "var(--gold)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px 20px", fontWeight: 800,
                  fontSize: 14, fontFamily: "inherit",
                  cursor: isRunning || !idea.trim() ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.3s",
                }}
              >
                {isRunning ? "جارٍ..." : "ابدأ النقاش"}
              </button>
            </div>
            {isRunning && (
              <p style={{
                textAlign: "center", fontSize: 10.5,
                color: "var(--text-ghost)", marginTop: 6,
              }}>
                ⏱ الجلسة تمر بـ 4 مراحل — قد تستغرق 1-2 دقيقة
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
