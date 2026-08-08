const modelsToTest = [
  "cx/gpt-5.5",
  "Ai.sicloud.biz.id/cx/gpt-5.5",
  "ai.sicloud.biz.id/cx/gpt-5.5",
  "custom:Ai.sicloud.biz.id/cx/gpt-5.5",
  "custom:ai.sicloud.biz.id/cx/gpt-5.5",
  "tamandata/cx/gpt-5.5",
  "openai/cx/gpt-5.5",
  "openai-compatible-chat/cx/gpt-5.5",
  "custom/ai.sicloud.biz.id/cx/gpt-5.5",
  "openai:ai.sicloud.biz.id/cx/gpt-5.5"
];

async function run() {
  for (const m of modelsToTest) {
    const res = await fetch('http://127.0.0.1:8642/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560' },
      body: JSON.stringify({ model: m })
    });
    const data = await res.json();
    console.log(m, "=>", data.error ? data.error : "SUCCESS: " + data.session.id);
  }
}
run();
