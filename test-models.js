fetch('http://127.0.0.1:8642/api/models', {
  headers: { 'Authorization': 'Bearer 86d68a01f0db38e3e2f323ee7faf15775c727e798cf516aee93627c68d1a7560' }
}).then(r=>r.text()).then(console.log);
