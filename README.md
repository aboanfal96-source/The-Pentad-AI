# 🏛️ مجلس الإدارة الافتراضي — Ultimate Edition v3

## ✨ المميزات الجديدة

### 📎 رفع الملفات ومناقشتها
- ارفق PDF, DOCX, TXT, CSV, JSON
- الأعضاء يقرأون المحتوى ويناقشونه
- مثال: ارفق ملف هندسة قيمية واطلب محاكاته لمشروع معين

### 💬 نقاش مستمر (لا يُقفل حتى تقرر أنت)
- بعد القرار الأول، اكتب طلباً إضافياً
- الأعضاء يردون على طلبك الجديد بناء على النقاش السابق
- يمكنك الاستمرار في جولات متعددة

### 📕📘 تصدير PDF و Word
- زر PDF يصدر تقريراً كاملاً
- زر Word يصدر ملف DOCX مع Headers و Footers

### 🔀 تنوع حقيقي (Claude + GPT-4o + Gemini)
- كل عضو يمكن أن يعمل بنموذج مختلف
- Fallback تلقائي لـ Claude إذا لم تتوفر مفاتيح أخرى

---

## 🚀 النشر على Vercel

```bash
git init && git add . && git commit -m "v3"
git remote add origin https://github.com/YOU/virtual-boardroom.git
git push -u origin main
```

في Vercel → Environment Variables:

| المتغير | مطلوب؟ |
|---------|--------|
| `ANTHROPIC_API_KEY` | ✅ مطلوب |
| `OPENAI_API_KEY` | اختياري |
| `GEMINI_API_KEY` | اختياري |

Deploy ✅

## 🖥️ محلياً

```bash
npm install
cp .env.example .env.local
# عدّل المفاتيح
npm run dev
```

## 📁 هيكل المشروع

```
app/
├── page.tsx              # الواجهة الرئيسية
├── layout.tsx
├── globals.css
├── api/
│   ├── chat/route.ts     # Multi-model AI routing
│   ├── search/route.ts   # Web search
│   ├── read-file/route.ts    # File text extraction
│   ├── export-pdf/route.ts   # PDF generation
│   └── export-docx/route.ts  # DOCX generation
lib/
└── agents.ts             # Agents config
```
