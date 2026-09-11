const btn = document.getElementById("analyze");
const q = document.getElementById("question");
const imageInput = document.getElementById("imageInput");
const status = document.getElementById("status");
const result = document.getElementById("result");
const finalText = document.getElementById("finalText");
const gptText = document.getElementById("gptText");
const claudeText = document.getElementById("claudeText");

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

btn.addEventListener("click", async () => {
  const question = q.value.trim();
  const file = imageInput.files[0];

  if (!question && !file) {
    status.textContent = "اكتب السؤال أو اختر صورة أولاً.";
    return;
  }

  btn.disabled = true;
  result.classList.add("hidden");
  status.textContent = "GPT وClaude يحللان الحالة الآن...";

  try {
    let image = null;

    if (file) {
      image = await fileToDataURL(file);
    }

    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        image
      })
    });

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data.error || "فشل التحليل");
    }

    finalText.textContent = data.final;
    gptText.textContent = data.gpt;
    claudeText.textContent = data.claude;

    result.classList.remove("hidden");

    status.textContent =
      `تم • GPT: ${data.models?.openai || ""} • Claude: ${data.models?.anthropic || ""}`;

    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (e) {
    status.textContent = "خطأ: " + e.message;
  } finally {
    btn.disabled = false;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
