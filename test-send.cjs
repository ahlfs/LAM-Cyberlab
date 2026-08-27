const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/auth',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let cookies = res.headers['set-cookie'];
  
  const req2 = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/send-stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies ? cookies.join('; ') : ''
    }
  }, (res2) => {
    res2.on('data', d => process.stdout.write(d));
  });
  req2.write(JSON.stringify({
    model: 'vps/open-router/stealth/ox-alpha',
    message: 'Kamu model apa?',
    sessionKey: 'test-session-123'
  }));
  req2.end();
});

req.write(JSON.stringify({ password: 'sheesh123' }));
req.end();
