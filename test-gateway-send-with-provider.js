async function run() {
  
  // 1. Create Session WITH provider
  const res1 = await fetch('http://127.0.0.1:8642/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560'
    },
    body: JSON.stringify({ 
      model: "cx/gpt-5.5",
      provider: "custom:ai.sicloud.biz.id"
    })
  });
  const data = await res1.json();
  const sessionId = data.session.id;
  console.log("Create:", sessionId);

  // 2. Chat Stream WITH provider
  const res2 = await fetch(`http://127.0.0.1:8642/api/sessions/${sessionId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560'
    },
    body: JSON.stringify({
      message: "test",
      model: "cx/gpt-5.5",
      provider: "custom:ai.sicloud.biz.id"
    })
  });
  console.log("Stream:", res2.status);
  const reader = res2.body.getReader();
  const decoder = new TextDecoder();
  let firstChunk = true;
  while(true) {
    const {done, value} = await reader.read();
    if(done) break;
    if(firstChunk) { console.log("Stream Data:", decoder.decode(value)); firstChunk = false; }
  }
}
run();
