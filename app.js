
const btn = document.getElementById("analyze");
const q = document.getElementById("question");
const status = document.getElementById("status");
const result = document.getElementById("result");
const finalText = document.getElementById("finalText");
const gptText = document.getElementById("gptText");
const claudeText = document.getElementById("claudeText");

btn.addEventListener("click", async () => {
  const question = q.value.trim();
  if (!question) {
    status.textContent = "اكتب السؤال أولًا.";
    q.focus();
    return;
  }
  btn.disabled = true;
  result.classList.add("hidden");
  status.textContent = "GPT وClaude يحللان الحالة الآن…";

  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "تعذر التحليل");

    finalText.textContent = data.final;
    gptText.textContent = data.gpt;
    claudeText.textContent = data.claude;
    result.classList.remove("hidden");
    status.textContent = `تم • GPT: ${data.models.openai} • Claude: ${data.models.claude}`;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    status.textContent = "خطأ: " + e.message;
  } finally {
    btn.disabled = false;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
