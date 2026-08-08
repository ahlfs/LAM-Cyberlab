fetch('http://127.0.0.1:8642/api/sessions', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560'
  },
  body: JSON.stringify({ model: 'cx/gpt-5.5' })
}).then(res => res.json()).then(data => {
  const sessionId = data.session.id;
  console.log("Created session:", sessionId);
  fetch(`http://127.0.0.1:8642/api/sessions/${sessionId}/chat/stream`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560'
    },
    body: JSON.stringify({ message: 'hello', model: 'cx/gpt-5.5' })
  }).then(res => res.text()).then(console.log);
});
