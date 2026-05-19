"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AGENTS, PHASES, PHASE_LABELS, genId, type Agent, type BoardMessage } from "@/lib/agents";

/* ═══ API helpers ═══ */
async function callAgent(sys: string, msg: string, provider = "claude") {
  const r = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt: sys, userMessage: msg, provider }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return { text: d.text as string, provider: d.provider as string };
}

async function readFile(file: File): Promise<{ text: string; fileName: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/read-file", { method: "POST", body: fd });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return { text: d.text, fileName: d.fileName };
}

async function searchWeb(q: string) {
  try {
    const r = await fetch("/api/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    return (await r.json()).results || "";
  } catch { return ""; }
}

/* ═══ Sub-components ═══ */
function Dots({ color }: { color: string }) {
  return <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
    {[0,1,2].map(i => <span key={i} style={{
      width:5,height:5,borderRadius:"50%",background:color,display:"inline-block",
      animation:`pulseDot 1.2s ease-in-out ${i*.15}s infinite`,
    }}/>)}
  </span>;
}

function Avatar({ agent, size = 34, active = false }: { agent: Agent; size?: number; active?: boolean }) {
  return <div style={{
    width:size,height:size,borderRadius:size*.3,
    background:`linear-gradient(145deg,${agent.color}28,${agent.color}0a)`,
    border:`1.5px solid ${agent.color}${active?"88":"33"}`,
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:size*.48,flexShrink:0,
    animation:active?"breathe 2s ease infinite":"none",
  }}>{agent.avatar}</div>;
}

function Badge({ provider }: { provider?: string }) {
  if (!provider) return null;
  const m: Record<string,{l:string;c:string}> = {
    claude:{l:"Claude",c:"#c9a255"}, openai:{l:"GPT-4o",c:"#44aa77"}, gemini:{l:"Gemini",c:"#4488cc"},
  };
  const p = m[provider] || m.claude;
  return <span style={{fontSize:9,padding:"1px 6px",borderRadius:6,background:`${p.c}18`,color:`${p.c}cc`,border:`1px solid ${p.c}22`,fontWeight:600}}>{p.l}</span>;
}

function formatMsg(t: string) {
  return t.replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g,(_,__,code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g,"<code>$1</code>");
}

function MsgCard({ msg, providers }: { msg: BoardMessage; providers: Record<string,string> }) {
  const agent = AGENTS.find(a => a.id === msg.agentId)!;
  const isDecision = msg.phase === "decision";
  return <div style={{animation:"fadeUp .4s ease both",marginBottom:14}}>
    <div style={{
      background:isDecision?`linear-gradient(135deg,${agent.color}0c,#44aa7708)`:"var(--bg-card)",
      border:`1px solid ${isDecision?agent.color+"33":"var(--border)"}`,
      borderRight:`3px solid ${agent.color}`,borderRadius:14,padding:"14px 16px",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <Avatar agent={agent} size={30}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{color:agent.color,fontWeight:700,fontSize:13}}>{agent.name}</span>
            <Badge provider={providers[msg.id]}/>
            {isDecision && <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,background:"var(--gold)18",color:"var(--gold)",fontWeight:700}}>📜 القرار</span>}
          </div>
          <div style={{color:"var(--text-ghost)",fontSize:10}}>{agent.role} · {PHASE_LABELS[msg.phase]||""}</div>
        </div>
      </div>
      <div className="msg-body" style={{color:isDecision?"#d8d0c0":"var(--text-main)",fontSize:13.5,lineHeight:2,whiteSpace:"pre-wrap"}}
        dangerouslySetInnerHTML={{__html:formatMsg(msg.text)}}/>
    </div>
  </div>;
}

function PhaseTimeline({ current }: { current: string }) {
  const idx = PHASES.findIndex(p => p.id === current);
  return <div style={{display:"flex",flexDirection:"column",gap:2}}>
    {PHASES.map((p,i) => {
      const done = i < idx; const active = i === idx;
      const clr = active?"var(--gold)":done?"var(--green)":"var(--text-ghost)";
      return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 8px",borderRadius:8,background:active?"var(--gold)0a":"transparent"}}>
        <div style={{width:20,height:20,borderRadius:6,background:done?"var(--green)22":active?"var(--gold)18":"var(--bg-card)",border:`1.5px solid ${active?"var(--gold)44":done?"var(--green)44":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:clr,fontWeight:700}}>
          {done?"✓":p.icon}
        </div>
        <span style={{fontSize:11,color:clr,fontWeight:active?700:400}}>{p.label}</span>
      </div>;
    })}
  </div>;
}

/* ═══ MAIN ═══ */
export default function Home() {
  const [idea, setIdea] = useState("");
  const [phase, setPhase] = useState("idle");
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<string|null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providers, setProviders] = useState<Record<string,string>>({});
  const [uploadedFile, setUploadedFile] = useState<{name:string;text:string}|null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [exporting, setExporting] = useState<string|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeAgent]);

  const addMsg = useCallback((agentId: string, text: string, msgPhase: string, prov?: string) => {
    const id = genId();
    setMessages(prev => [...prev, { id, agentId, text, phase: msgPhase, timestamp: Date.now() }]);
    if (prov) setProviders(prev => ({ ...prev, [id]: prov }));
    return id;
  }, []);

  /* ─── Handle file upload ─── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const result = await readFile(file);
      setUploadedFile({ name: result.fileName, text: result.text });
    } catch (err: any) {
      setError("فشل قراءة الملف: " + err.message);
    }
    setIsUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ─── Run full boardroom discussion ─── */
  const runBoardroom = async () => {
    if ((!idea.trim() && !uploadedFile) || isRunning) return;
    setIsRunning(true);
    setMessages([]);
    setError("");
    setProviders({});
    setSidebarOpen(false);
    setSessionStarted(true);

    const topic = idea.trim();
    const fileContext = uploadedFile
      ? `\n\n═══ محتوى الملف المرفق (${uploadedFile.name}) ═══\n${uploadedFile.text}\n═══ نهاية الملف ═══`
      : "";
    const fullInput = topic + fileContext;

    try {
      // Phase 1
      setPhase("analysis");
      setActiveAgent("claude");
      const r1 = await callAgent(AGENTS[0].systemPrompt,
        `${uploadedFile ? `تم إرفاق ملف: "${uploadedFile.name}"\n` : ""}الفكرة/الطلب: "${topic}"\n${fileContext}\n\nحلل بعمق وحدد المحاور الأساسية.`,
        AGENTS[0].provider);
      addMsg("claude", r1.text, "analysis", r1.provider);

      // Phase 2
      setPhase("discussion");
      const panel: Record<string,string> = {};

      setActiveAgent("gemini");
      const search = await searchWeb(`${topic} market analysis statistics`);
      const r2 = await callAgent(AGENTS[1].systemPrompt,
        `الموضوع: "${topic}"\n${fileContext ? `الملف المرفق:\n${uploadedFile?.text?.slice(0,3000)}\n` : ""}تحليل المدير: ${r1.text}\n${search?`بيانات بحثية:\n${search}\n`:""}قدم تحليلك البحثي.`,
        AGENTS[1].provider);
      panel.gemini = r2.text; addMsg("gemini", r2.text, "discussion", r2.provider);

      setActiveAgent("chatgpt");
      const r3 = await callAgent(AGENTS[2].systemPrompt,
        `الموضوع: "${topic}"\n${fileContext ? `الملف:\n${uploadedFile?.text?.slice(0,2000)}\n` : ""}تحليل المدير: ${r1.text}\nبيانات جيمناي: ${r2.text.slice(0,500)}\nقدم رؤيتك الإبداعية.`,
        AGENTS[2].provider);
      panel.chatgpt = r3.text; addMsg("chatgpt", r3.text, "discussion", r3.provider);

      setActiveAgent("manus");
      const r4 = await callAgent(AGENTS[3].systemPrompt,
        `الموضوع: "${topic}"\n${fileContext ? `الملف:\n${uploadedFile?.text?.slice(0,2000)}\n` : ""}التحليل: ${r1.text}\nالابتكار: ${r3.text.slice(0,500)}\nصمم البنية التقنية. اكتب كود إن لزم.`,
        AGENTS[3].provider);
      panel.manus = r4.text; addMsg("manus", r4.text, "discussion", r4.provider);

      setActiveAgent("kimi");
      const r5 = await callAgent(AGENTS[4].systemPrompt,
        `الموضوع: "${topic}"\nملخص الآراء:\n- كلاود: ${r1.text.slice(0,300)}\n- جيمناي: ${r2.text.slice(0,300)}\n- جي بي تي: ${r3.text.slice(0,300)}\n- مانوس: ${r4.text.slice(0,300)}\n\nمارس دورك كمحامي الشيطان.`,
        AGENTS[4].provider);
      panel.kimi = r5.text; addMsg("kimi", r5.text, "discussion", r5.provider);

      // Phase 3
      setPhase("iteration");
      setActiveAgent("gemini");
      const r6 = await callAgent(AGENTS[1].systemPrompt,
        `انتقادات كيمي: ${r5.text}\nمقترحات مانوس: ${r4.text.slice(0,400)}\nرد من منظورك البحثي.`,
        AGENTS[1].provider);
      addMsg("gemini", r6.text, "iteration", r6.provider);

      setActiveAgent("chatgpt");
      const r7 = await callAgent(AGENTS[2].systemPrompt,
        `انتقادات كيمي: ${r5.text}\nرد جيمناي: ${r6.text.slice(0,400)}\nطوّر مقترحاتك بناء على النقد.`,
        AGENTS[2].provider);
      addMsg("chatgpt", r7.text, "iteration", r7.provider);

      setActiveAgent("manus");
      const r8 = await callAgent(AGENTS[3].systemPrompt,
        `الانتقادات: ${r5.text.slice(0,300)}\nالتحسينات: ${r7.text.slice(0,300)}\nحدّث خطتك التقنية.`,
        AGENTS[3].provider);
      addMsg("manus", r8.text, "iteration", r8.provider);

      // Phase 4
      setPhase("decision");
      setActiveAgent("claude");
      const finalR = await callAgent(
        `أنت رئيس المجلس. أصدر القرار النهائي الشامل متضمناً:
1) ملخص تنفيذي 2) تحليل السوق 3) الاستراتيجية الإبداعية 4) الخطة التقنية 5) المخاطر 6) القرار 7) خطة العمل
${uploadedFile ? "8) كيف تم تطبيق محتوى الملف المرفق في التحليل" : ""}
اكتب بالعربية بترقيم واضح. لا markdown.`,
        `الموضوع: "${topic}"\n${fileContext}\n\nتحليلي: ${r1.text}\n\nالأعضاء:\n- جيمناي: ${r2.text}\n- جي بي تي: ${r3.text}\n- مانوس: ${r4.text}\n- كيمي: ${r5.text}\n\nالمراجعات:\n- جيمناي: ${r6.text}\n- جي بي تي: ${r7.text}\n- مانوس: ${r8.text}\n\nأصدر القرار.`,
        "claude");
      addMsg("claude", finalR.text, "decision", finalR.provider);
      setPhase("complete");
    } catch (e: any) {
      setError(e.message);
    }
    setActiveAgent(null);
    setIsRunning(false);
  };

  /* ─── Follow-up: continue discussion ─── */
  const sendFollowUp = async () => {
    if (!idea.trim() || isRunning) return;
    setIsRunning(true);
    setError("");
    const followUpText = idea.trim();
    setIdea("");
    setPhase("followup");

    const context = messages.slice(-6).map(m => {
      const a = AGENTS.find(x => x.id === m.agentId);
      return `${a?.name}: ${m.text.slice(0, 400)}`;
    }).join("\n\n");

    try {
      // Each agent responds to the follow-up
      for (const agent of AGENTS) {
        setActiveAgent(agent.id);
        const r = await callAgent(
          agent.systemPrompt,
          `سياق النقاش السابق:\n${context}\n\nطلب المستخدم الجديد: "${followUpText}"\n\nقدم ردك على هذا الطلب الجديد بناء على النقاش السابق.`,
          agent.provider
        );
        addMsg(agent.id, r.text, "followup", r.provider);
      }

      // Claude summarizes
      setActiveAgent("claude");
      const summary = await callAgent(
        `أنت رئيس المجلس. لخّص ردود الأعضاء على الطلب الإضافي في قرار محدّث. اكتب بالعربية بترقيم. لا markdown.`,
        `الطلب الإضافي: "${followUpText}"\n\nردود الأعضاء:\n${messages.slice(-5).map(m => `${AGENTS.find(a=>a.id===m.agentId)?.name}: ${m.text}`).join("\n\n")}\n\nأصدر الملخص المحدّث.`,
        "claude"
      );
      addMsg("claude", summary.text, "decision", summary.provider);
      setPhase("complete");
    } catch (e: any) {
      setError(e.message);
    }
    setActiveAgent(null);
    setIsRunning(false);
  };

  /* ─── Export ─── */
  const exportFile = async (format: "pdf" | "docx") => {
    setExporting(format);
    try {
      const body = JSON.stringify({
        messages, idea,
        agents: AGENTS.map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color, avatar: a.avatar })),
      });
      const r = await fetch(`/api/export-${format}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boardroom-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("فشل التصدير: " + e.message);
    }
    setExporting(null);
  };

  const msgCount = (id: string) => messages.filter(m => m.agentId === id).length;

  /* ─── Sidebar ─── */
  const Sidebar = () => <div style={{padding:16}}>
    <div style={{fontSize:10,color:"var(--text-ghost)",fontWeight:700,marginBottom:10,letterSpacing:.5}}>أعضاء المجلس</div>
    {AGENTS.map(a => {
      const active = activeAgent === a.id; const c = msgCount(a.id);
      return <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,marginBottom:4,background:active?`${a.color}0c`:"transparent",border:`1px solid ${active?a.color+"33":"transparent"}`}}>
        <Avatar agent={a} size={32} active={active}/>
        <div style={{flex:1}}>
          <div style={{color:active?a.color:"var(--text-bright)",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}>
            {a.name} {active && <Dots color={a.color}/>}
          </div>
          <div style={{color:"var(--text-ghost)",fontSize:9.5}}>{a.role}</div>
        </div>
        {c > 0 && <span style={{background:a.color,color:"var(--bg-void)",borderRadius:7,padding:"1px 7px",fontSize:10,fontWeight:800}}>{c}</span>}
      </div>;
    })}
    <div style={{borderTop:"1px solid var(--border)",marginTop:14,paddingTop:14}}>
      <div style={{fontSize:10,color:"var(--text-ghost)",fontWeight:700,marginBottom:8}}>مراحل الجلسة</div>
      <PhaseTimeline current={phase}/>
    </div>
    {uploadedFile && <div style={{borderTop:"1px solid var(--border)",marginTop:14,paddingTop:14}}>
      <div style={{fontSize:10,color:"var(--text-ghost)",fontWeight:700,marginBottom:8}}>الملف المرفق</div>
      <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>📄</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"var(--text-bright)",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedFile.name}</div>
          <div style={{color:"var(--text-ghost)",fontSize:9}}>{(uploadedFile.text.length/1000).toFixed(1)}K حرف</div>
        </div>
        <button onClick={() => setUploadedFile(null)} style={{background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:14}}>✕</button>
      </div>
    </div>}
    {messages.length > 0 && phase === "complete" && <div style={{borderTop:"1px solid var(--border)",marginTop:14,paddingTop:14}}>
      <div style={{fontSize:10,color:"var(--text-ghost)",fontWeight:700,marginBottom:8}}>تصدير التقرير</div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={() => exportFile("pdf")} disabled={!!exporting}
          style={{flex:1,padding:"9px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)",color:exporting==="pdf"?"var(--gold)":"var(--text-dim)",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:600}}>
          {exporting==="pdf"?"جاري...":"📕 PDF"}
        </button>
        <button onClick={() => exportFile("docx")} disabled={!!exporting}
          style={{flex:1,padding:"9px",borderRadius:8,background:"var(--bg-card)",border:"1px solid var(--border)",color:exporting==="docx"?"var(--gold)":"var(--text-dim)",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:600}}>
          {exporting==="docx"?"جاري...":"📘 Word"}
        </button>
      </div>
    </div>}
  </div>;

  return <div style={{height:"100vh",display:"flex",flexDirection:"column"}}>
    {/* Header */}
    <header style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",background:"var(--bg-base)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:20,cursor:"pointer",padding:4,display:"none",alignItems:"center"}}>☰</button>
      <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,var(--gold)33,var(--blue)22,var(--green)22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏛️</div>
      <div style={{flex:1}}>
        <h1 className="heading" style={{fontSize:16,fontWeight:800,color:"#e8dcc8",letterSpacing:-.3}}>مجلس الإدارة الافتراضي</h1>
        <p style={{fontSize:10,color:"var(--text-ghost)"}}>Virtual Boardroom Ultimate · Multi-Model + Files</p>
      </div>
      {isRunning && <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--gold)0c",border:"1px solid var(--gold)22",borderRadius:20,padding:"5px 14px"}}>
        <div style={{width:8,height:8,borderRadius:"50%",border:"2px solid var(--gold)",borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>
        <span style={{fontSize:11,color:"var(--gold)",fontWeight:600}}>جارٍ النقاش</span>
      </div>}
    </header>

    <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
      <div className={`overlay ${sidebarOpen?"visible":""}`} onClick={() => setSidebarOpen(false)}/>
      <aside className="desktop-sidebar" style={{width:240,minWidth:240,borderLeft:"1px solid var(--border)",background:"var(--bg-base)",overflowY:"auto",flexShrink:0}}><Sidebar/></aside>
      <aside className={`sidebar-mobile ${sidebarOpen?"open":""}`} style={{width:280,background:"var(--bg-base)",overflowY:"auto"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:14,color:"var(--text-bright)"}}>المجلس</span>
          <button onClick={() => setSidebarOpen(false)} style={{background:"none",border:"none",color:"var(--text-dim)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <Sidebar/>
      </aside>

      {/* Chat */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"20px 20px 10px"}}>
          {/* Empty state */}
          {messages.length === 0 && !isRunning && <div style={{textAlign:"center",paddingTop:"10vh",animation:"fadeUp .6s ease"}}>
            <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 20px",background:"linear-gradient(135deg,var(--gold)20,var(--blue)15,var(--green)10)",border:"1px solid var(--gold)22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>🏛️</div>
            <h2 className="heading" style={{fontSize:20,fontWeight:800,color:"var(--text-bright)",marginBottom:8}}>مجلس الإدارة جاهز</h2>
            <p style={{fontSize:13,color:"var(--text-ghost)",maxWidth:420,margin:"0 auto",lineHeight:1.9}}>
              اكتب فكرتك أو ارفق ملفاً — سيتناقش خمسة نماذج ذكاء اصطناعي ويصدرون قراراً نهائياً.
              <br/>بعد القرار، يمكنك الاستمرار بالنقاش أو طلب تعديلات إضافية.
            </p>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:20,flexWrap:"wrap"}}>
              {["📄 ارفق ملف وناقشه","💬 نقاش مستمر","📕 تصدير PDF + Word","🔀 نماذج متعددة"].map(f =>
                <span key={f} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 12px",fontSize:10,color:"var(--text-dim)"}}>{f}</span>
              )}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16,flexWrap:"wrap"}}>
              {["دراسة هندسة قيمية لمشروع سكني","منصة تداول عملات رقمية","تطبيق صحي بالذكاء الاصطناعي"].map(ex =>
                <button key={ex} onClick={() => setIdea(ex)} style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,padding:"6px 14px",color:"var(--text-dim)",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                  {ex}
                </button>
              )}
            </div>
          </div>}

          {messages.map(m => <MsgCard key={m.id} msg={m} providers={providers}/>)}

          {activeAgent && isRunning && <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 4px",animation:"fadeUp .3s ease"}}>
            <Avatar agent={AGENTS.find(a=>a.id===activeAgent)!} size={28} active/>
            <span style={{color:AGENTS.find(a=>a.id===activeAgent)!.color,fontWeight:700,fontSize:12}}>{AGENTS.find(a=>a.id===activeAgent)!.name}</span>
            <Dots color={AGENTS.find(a=>a.id===activeAgent)!.color}/>
            <span style={{color:"var(--text-ghost)",fontSize:11}}>يكتب...</span>
          </div>}

          {error && <div style={{background:"var(--red)0c",border:"1px solid var(--red)33",borderRadius:12,padding:"14px 16px",color:"#e89898",fontSize:13,marginTop:8,animation:"fadeUp .3s ease"}}>
            ⚠️ {error}
          </div>}

          {/* Post-decision prompt */}
          {phase === "complete" && !isRunning && <div style={{textAlign:"center",padding:"20px 0",animation:"fadeUp .5s ease"}}>
            <div style={{background:"var(--gold)08",border:"1px solid var(--gold)22",borderRadius:14,padding:"16px 20px",maxWidth:500,margin:"0 auto"}}>
              <p style={{fontSize:13,color:"var(--gold)",fontWeight:600,marginBottom:4}}>✅ اكتمل النقاش والقرار</p>
              <p style={{fontSize:11,color:"var(--text-dim)",lineHeight:1.8}}>
                يمكنك الآن: كتابة طلب إضافي للاستمرار بالنقاش، أو تصدير التقرير من القائمة الجانبية
              </p>
            </div>
          </div>}
        </div>

        {/* Input */}
        <div style={{padding:"10px 18px 14px",borderTop:"1px solid var(--border)",background:"var(--bg-base)",flexShrink:0}}>
          {/* File chip */}
          {uploadedFile && <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",width:"fit-content"}}>
            <span>📄</span>
            <span style={{fontSize:11,color:"var(--text-bright)",fontWeight:500}}>{uploadedFile.name}</span>
            <button onClick={() => setUploadedFile(null)} style={{background:"none",border:"none",color:"var(--text-ghost)",cursor:"pointer",fontSize:12,marginRight:4}}>✕</button>
          </div>}

          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            {/* File upload button */}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.doc" onChange={handleFileUpload} style={{display:"none"}}/>
            <button onClick={() => fileRef.current?.click()} disabled={isRunning || isUploading}
              style={{width:42,height:42,borderRadius:10,background:"var(--bg-card)",border:"1px solid var(--border)",color:isUploading?"var(--gold)":"var(--text-dim)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {isUploading ? <span style={{width:14,height:14,borderRadius:"50%",border:"2px solid var(--gold)",borderTopColor:"transparent",animation:"spin .8s linear infinite",display:"block"}}/> : "📎"}
            </button>

            <textarea
              value={idea} onChange={e => setIdea(e.target.value)}
              placeholder={sessionStarted && phase === "complete" ? "اكتب طلبك الإضافي للاستمرار بالنقاش..." : "اكتب فكرتك أو طلبك هنا..."}
              disabled={isRunning} rows={2}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sessionStarted && phase === "complete" ? sendFollowUp() : runBoardroom(); } }}
              style={{flex:1,background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 14px",color:"var(--text-bright)",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.7,outline:"none"}}
              onFocus={e => e.target.style.borderColor = "var(--gold)44"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />

            <button
              onClick={sessionStarted && phase === "complete" ? sendFollowUp : runBoardroom}
              disabled={isRunning || (!idea.trim() && !uploadedFile)}
              style={{
                background: isRunning || (!idea.trim() && !uploadedFile) ? "var(--bg-card)" : "linear-gradient(135deg,var(--gold),#a88838)",
                color: isRunning || (!idea.trim() && !uploadedFile) ? "var(--text-ghost)" : "var(--bg-void)",
                border:`1px solid ${isRunning || (!idea.trim() && !uploadedFile) ? "var(--border)" : "var(--gold)"}`,
                borderRadius:10,padding:"11px 18px",fontWeight:800,fontSize:13,fontFamily:"inherit",
                cursor:isRunning?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .3s",
              }}>
              {isRunning ? "جارٍ..." : sessionStarted && phase === "complete" ? "تابع 💬" : "ابدأ 🚀"}
            </button>
          </div>
          {isRunning && <p style={{textAlign:"center",fontSize:10,color:"var(--text-ghost)",marginTop:6}}>⏱ قد تستغرق الجلسة 1-2 دقيقة</p>}
        </div>
      </main>
    </div>
  </div>;
}
