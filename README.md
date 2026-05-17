# 🏛️ مجلس الإدارة الافتراضي | Virtual Boardroom Pro v2

منصة نقاش ذكية متعددة النماذج — خمسة نماذج ذكاء اصطناعي يتناقشون ويصدرون قراراً نهائياً موحداً.

## ✨ ما الجديد في النسخة المطورة؟

### 🔀 تنوع حقيقي بين النماذج
- **Claude** (Anthropic) — رئيس المجلس + CTO + المراقب
- **GPT-4o** (OpenAI) — رئيس الابتكار
- **Gemini** (Google) — رئيس البحث والبيانات
- نظام fallback ذكي: إذا لم يتوفر مفتاح OpenAI أو Gemini، يتم الرجوع تلقائياً لـ Claude

### 🔬 قدرات بحثية حقيقية
- البحث في الويب عبر Gemini API
- تحليل بيانات السوق والمنافسين

### ⚙️ أدوار محسّنة
- **كيمي** أصبح "محامي الشيطان" — ينتقد ويكشف الثغرات بلا مجاملة
- **مانوس** أصبح CTO — يكتب كود فعلي ويصمم البنية التقنية
- مرحلة المراجعة أصبحت أعمق: كل عضو يرد على انتقادات الآخرين

### 📱 واجهة محسّنة
- تصميم متجاوب (Desktop + Mobile)
- عرض النموذج الفعلي المستخدم لكل رد (Claude/GPT-4o/Gemini)
- تصدير التقرير كملف نصي
- أمثلة أفكار جاهزة للتجربة
- تنسيق أكواد البرمجة داخل الردود

---

## 🚀 النشر على Vercel

### الخطوة 1: رفع المشروع على GitHub

```bash
cd virtual-boardroom-pro
git init
git add .
git commit -m "Virtual Boardroom Pro v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/virtual-boardroom.git
git push -u origin main
```

### الخطوة 2: النشر على Vercel

1. سجل دخول في [vercel.com](https://vercel.com)
2. اضغط **"Add New → Project"**
3. اختر الريبو من GitHub
4. أضف **Environment Variables**:

| المتغير | مطلوب؟ | الوصف |
|---------|--------|-------|
| `ANTHROPIC_API_KEY` | ✅ مطلوب | من [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | اختياري | من [platform.openai.com](https://platform.openai.com/api-keys) |
| `GEMINI_API_KEY` | اختياري | من [aistudio.google.com](https://aistudio.google.com/apikey) |

5. اضغط **Deploy** ✅

> **ملاحظة:** المنصة تعمل بمفتاح Anthropic فقط. إضافة مفاتيح OpenAI و Gemini يفعّل التنوع الحقيقي بين النماذج.

---

## 🖥️ التشغيل محلياً

```bash
npm install

# أنشئ ملف .env.local
cp .env.example .env.local
# عدّل المفاتيح في .env.local

npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

---

## 🏗️ البنية التقنية

```
app/
├── page.tsx          # الواجهة الرئيسية (React)
├── layout.tsx        # التخطيط والخطوط
├── globals.css       # الأنماط
├── api/
│   ├── chat/route.ts    # API ذكي يوجه للنموذج المناسب
│   └── search/route.ts  # بحث الويب عبر Gemini
lib/
└── agents.ts         # إعدادات الأعضاء والمراحل
```

## 📊 كيف يعمل النقاش؟

```
المرحلة 1: التحليل
  └─ كلاود (رئيس المجلس) يحلل الفكرة ويحدد المحاور

المرحلة 2: النقاش الجماعي
  ├─ جيمناي يبحث في البيانات والسوق
  ├─ جي بي تي يبتكر الحلول والاستراتيجيات
  ├─ مانوس يصمم البنية التقنية ويكتب كود
  └─ كيمي ينتقد ويكشف الثغرات

المرحلة 3: المراجعة المتبادلة
  ├─ جيمناي يرد على انتقادات كيمي بالأدلة
  ├─ جي بي تي يحسّن مقترحاته بناء على النقد
  └─ مانوس يحدّث الخطة التقنية

المرحلة 4: القرار النهائي
  └─ كلاود يدمج كل شيء في تقرير شامل مع قرار وخطة عمل
```

## 💰 التكلفة التقريبية

كل جلسة نقاش = ~10 طلبات API
- Claude فقط: ~$0.10-0.15 لكل جلسة
- مع GPT-4o + Gemini: ~$0.15-0.25 لكل جلسة
