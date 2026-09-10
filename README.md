# Garage Center AI v1

نسخة أولى كتطبيق ويب قابل للإضافة إلى شاشة الهاتف (PWA).

## ماذا يفعل؟
1. تكتب السؤال مرة واحدة.
2. يرسل السؤال إلى OpenAI وClaude بالتوازي.
3. يعرض رأي كل واحد.
4. يرسل الرأيين إلى "حَكَم" من OpenAI ليعطي خلاصة نهائية محايدة.

## إعداد المفاتيح
لا تضع المفاتيح داخل ملفات الواجهة العامة.

1. انسخ `.env.example` إلى ملف باسم `.env`
2. ضع مفتاح OpenAI بعد `OPENAI_API_KEY=`
3. ضع مفتاح Claude بعد `ANTHROPIC_API_KEY=`

مثال (المفاتيح هنا وهمية):
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

## تشغيله على الكمبيوتر
يحتاج Node.js 20 أو أحدث.

```bash
npm install
npm start
```

ثم افتح:
http://localhost:3000

## تشغيله على الهاتف
لظهوره كتطبيق حقيقي على الشاشة الرئيسية، الأفضل نشره على عنوان HTTPS.
بعد النشر افتح الرابط في Chrome على Samsung:
القائمة ⋮ > Add to Home screen / Install app

مهم: لا تنشر ملف `.env` ولا أي API key في GitHub أو داخل `public`.

## النماذج الافتراضية
OpenAI: gpt-5.6-terra
Claude: claude-sonnet-5
الحكم: gpt-5.6-terra

يمكن تغييرها من `.env` بدون تعديل الكود.

## الإصدار التالي المقترح
- رفع صورة ليبل أو DTC
- رفع PDF
- VIN
- زر بحث بالمصادر
- حفظ سجل الحالات
