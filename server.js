
import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const JUDGE_MODEL = process.env.JUDGE_MODEL || "gpt-5.6-terra";

const garageSystem = `
أنت مستشار فني وتجاري لكراج سيارات باسم Garage Center.
أجب بالعربية الواضحة. في المسائل الفنية:
- لا تفترض أرقام قطع أو pinout أو مواصفات غير مؤكدة.
- فرّق بين ما هو مؤكد، وما هو تقدير، وما يحتاج قياس/مرجع مصنع.
- إذا كان السؤال عن أعطال سيارات، رتّب التشخيص من الأكثر احتمالًا إلى الأقل.
- أعطِ خطوات فحص عملية وآمنة.
- لا تعتبر اتفاق النماذج دليلًا بحد ذاته.
كن مختصرًا لكن مفيدًا.
`;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    models: { openai: OPENAI_MODEL, claude: ANTHROPIC_MODEL, judge: JUDGE_MODEL }
  });
});

app.post("/api/analyze", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "اكتب السؤال أولًا." });
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "مفاتيح API غير مضبوطة في ملف .env" });
  }

  try {
    const [gptResult, claudeResult] = await Promise.allSettled([
      openai.responses.create({
        model: OPENAI_MODEL,
        reasoning: { effort: "medium" },
        input: [
          { role: "system", content: garageSystem },
          { role: "user", content: question }
        ]
      }),
      anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1800,
        system: garageSystem,
        messages: [{ role: "user", content: question }]
      })
    ]);

    const gptText = gptResult.status === "fulfilled"
      ? (gptResult.value.output_text || "لم يرجع GPT نصًا.")
      : `تعذر GPT: ${gptResult.reason?.message || "خطأ غير معروف"}`;

    const claudeText = claudeResult.status === "fulfilled"
      ? claudeResult.value.content.filter(x => x.type === "text").map(x => x.text).join("\n")
      : `تعذر Claude: ${claudeResult.reason?.message || "خطأ غير معروف"}`;

    const judgePrompt = `
السؤال الأصلي:
${question}

تحليل GPT:
${gptText}

تحليل Claude:
${claudeText}

اعمل كمراجع نهائي محايد. لا تفترض أن أي نموذج صحيح لمجرد أنه قال شيئًا.
أخرج النتيجة بالعربية بهذا الترتيب:
1) الخلاصة النهائية
2) نقاط الاتفاق
3) نقاط الاختلاف
4) ما الذي يحتاج مرجع/قياس قبل التنفيذ
5) درجة الثقة: منخفضة/متوسطة/عالية مع سبب قصير
إذا كانت البيانات غير كافية، قل ذلك بوضوح.
`;

    const judge = await openai.responses.create({
      model: JUDGE_MODEL,
      reasoning: { effort: "medium" },
      input: [
        { role: "system", content: "أنت حكم تقني محايد بين تحليلين مستقلين." },
        { role: "user", content: judgePrompt }
      ]
    });

    res.json({
      final: judge.output_text || "لم يرجع الحكم النهائي نصًا.",
      gpt: gptText,
      claude: claudeText,
      models: { openai: OPENAI_MODEL, claude: ANTHROPIC_MODEL, judge: JUDGE_MODEL }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "حدث خطأ أثناء التحليل." });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Garage Center AI running on http://localhost:${port}`);
});
