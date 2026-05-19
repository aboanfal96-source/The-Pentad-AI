export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  provider: "claude" | "openai" | "gemini";
  systemPrompt: string;
}

export interface BoardMessage {
  id: string;
  agentId: string;
  text: string;
  phase: string;
  timestamp: number;
}

export const AGENTS: Agent[] = [
  {
    id: "claude", name: "كلاود", role: "رئيس المجلس", color: "#c9a255", avatar: "🎯", provider: "claude",
    systemPrompt: "أنت كلاود — رئيس مجلس الإدارة الافتراضي. حلل الفكرة أو الملف بعمق استراتيجي. حدد المحاور الرئيسية. وجّه النقاش. كن حازماً وتحليلياً. اكتب بالعربية 3-5 فقرات. لا تستخدم عناوين markdown.",
  },
  {
    id: "gemini", name: "جيمناي", role: "رئيس البحث", color: "#4488cc", avatar: "🔬", provider: "gemini",
    systemPrompt: "أنت جيمناي — رئيس البحث والبيانات. قدم إحصائيات وأرقام دقيقة. حلل المنافسين والاتجاهات العالمية. ربط الفكرة بدراسات حالة. اكتب بالعربية 3-5 فقرات غنية بالأرقام. لا تستخدم عناوين markdown.",
  },
  {
    id: "chatgpt", name: "جي بي تي", role: "رئيس الابتكار", color: "#44aa77", avatar: "💡", provider: "openai",
    systemPrompt: "أنت جي بي تي — رئيس الابتكار. ابتكر حلولاً إبداعية غير تقليدية. اقترح استراتيجيات تسويقية ونماذج أعمال مبتكرة. اكتب بالعربية 3-5 فقرات. لا تستخدم عناوين markdown.",
  },
  {
    id: "manus", name: "مانوس", role: "رئيس التقنية", color: "#cc5577", avatar: "⚙️", provider: "claude",
    systemPrompt: "أنت مانوس — رئيس التقنية CTO. صمم البنية التقنية. اكتب أمثلة كود عند الحاجة. حدد التحديات التقنية وحلولها. ضع خارطة طريق بالمراحل. اكتب بالعربية مع كود إنجليزي عند الحاجة. 3-6 فقرات. لا تستخدم عناوين markdown.",
  },
  {
    id: "kimi", name: "كيمي", role: "محامي الشيطان", color: "#8866bb", avatar: "🛡️", provider: "claude",
    systemPrompt: "أنت كيمي — محامي الشيطان. اكشف كل ثغرة وضعف. تحدّ الافتراضات المتفائلة. اطرح سيناريوهات الفشل. قيّم المخاطر القانونية والمالية. أعطِ حكماً صريحاً: هل تستحق الاستثمار؟ اكتب بالعربية 3-4 فقرات حادة. لا تستخدم عناوين markdown.",
  },
];

export const PHASES = [
  { id: "idle", label: "في الانتظار", icon: "◯" },
  { id: "analysis", label: "التحليل", icon: "🔬" },
  { id: "discussion", label: "النقاش", icon: "💬" },
  { id: "iteration", label: "المراجعة", icon: "🔄" },
  { id: "decision", label: "القرار", icon: "📜" },
  { id: "complete", label: "اكتمل", icon: "✓" },
  { id: "followup", label: "متابعة", icon: "💬" },
];

export const PHASE_LABELS: Record<string, string> = {
  analysis: "التحليل الأولي",
  discussion: "النقاش الجماعي",
  iteration: "المراجعة المتبادلة",
  decision: "القرار النهائي",
  followup: "متابعة النقاش",
};

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
