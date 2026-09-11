import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.static("."));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-5.6-terra";

const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const JUDGE_MODEL =
  process.env.JUDGE_MODEL || "gpt-5.6-terra";


const garageSystem = `
أنت مستشار فني وتشخيصي لكراج سيارات باسم Garage Center.

أجب بالعربية الواضحة والمباشرة.

القواعد:
- حلل الصور والنصوص معاً.
- اقرأ أرقام القطع والملصقات وأكواد الأعطال الظاهرة بالصورة بدقة.
- لا تفترض رقم قطعة أو pinout غير مؤكد.
- فرق بين المعلومة المؤكدة والتقدير.
- في أعطال السيارات رتّب الاحتمالات من الأكثر احتمالاً إلى الأقل.
- أعط خطوات فحص عملية وآمنة.
- إذا الصورة غير واضحة، اذكر بالضبط ما الذي يحتاج صورة أوضح.
- لا تعتبر اتفاق النماذج دليلاً بحد ذاته.
- كن مختصراً لكن مفيداً.
`;


function parseDataUrl(dataUrl) {
  if (!dataUrl) return null;

  const match = dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );

  if (!match) {
    throw new Error("صيغة الصورة غير صحيحة");
  }

  return {
    mediaType: match[1],
    base64: match[2]
  };
}


async function askOpenAI(question, image) {
  const content = [];

  content.push({
    type: "input_text",
    text:
      (question || "حلل الصورة المرفقة فنياً.") +
      "\n\n" +
      garageSystem
  });

  if (image) {
    content.push({
      type: "input_image",
      image_url: image
    });
  }

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "user",
        content
      }
    ]
  });

  return response.output_text || "لم يصل رد من GPT";
}


async function askClaude(question, image) {
  const content = [];

  if (image) {
    const parsed = parseDataUrl(image);

    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.mediaType,
        data: parsed.base64
      }
    });
  }

  content.push({
    type: "text",
    text:
      garageSystem +
      "\n\nالسؤال أو الحالة:\n" +
      (question || "حلل الصورة المرفقة فنياً.")
  });

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content
      }
    ]
  });

  const text = response.content
    .filter(item => item.type === "text")
    .map(item => item.text)
    .join("\n");

  return text || "لم يصل رد من Claude";
}


async function judgeAnswers(question, gptAnswer, claudeAnswer) {
  const judgePrompt = `
أنت الحكم النهائي داخل Garage Center AI.

قارن بين تحليل GPT وتحليل Claude.

المطلوب:
1. استخرج نقاط الاتفاق.
2. استخرج نقاط الاختلاف.
3. لا تختَر جواباً لأنه أطول أو أكثر ثقة.
4. رجّح المعلومة الأقوى فنياً.
5. إذا كانت المعلومة غير مؤكدة، قل إنها تحتاج قياساً أو مرجعاً.
6. أعط خلاصة نهائية عملية للكراج.
7. اكتب بالعربية الواضحة.

السؤال:
${question || "تحليل صورة مرفقة"}

رأي GPT:
${gptAnswer}

رأي Claude:
${claudeAnswer}
`;

  const response = await openai.responses.create({
    model: JUDGE_MODEL,
    input: judgePrompt
  });

  return response.output_text || gptAnswer;
}


app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    models: {
      openai: OPENAI_MODEL,
      claude: ANTHROPIC_MODEL,
      judge: JUDGE_MODEL
    }
  });
});


app.post("/api/analyze", async (req, res) => {
  try {
    const question =
      typeof req.body.question === "string"
        ? req.body.question.trim()
        : "";

    const image =
      typeof req.body.image === "string"
        ? req.body.image
        : null;

    if (!question && !image) {
      return res.status(400).json({
        error: "اكتب سؤالاً أو أرفق صورة."
      });
    }

    const [gpt, claude] = await Promise.all([
      askOpenAI(question, image),
      askClaude(question, image)
    ]);

    const final = await judgeAnswers(
      question,
      gpt,
      claude
    );

    res.json({
      gpt,
      claude,
      final,
      models: {
        openai: OPENAI_MODEL,
        anthropic: ANTHROPIC_MODEL,
        judge: JUDGE_MODEL
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        error?.message ||
        "حدث خطأ أثناء التحليل."
    });
  }
});


app.get("/", (_req, res) => {
  res.sendFile(
    new URL("./index.html", import.meta.url).pathname
  );
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Garage Center AI running on port ${PORT}`);
});
