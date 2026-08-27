const http = require('http');
const req = http.request({
  hostname: '127.0.0.1', port: 3000, path: '/api/auth', method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let cookies = res.headers['set-cookie'];
  http.get({
    hostname: '127.0.0.1', port: 3000, path: '/api/models',
    headers: { 'Cookie': cookies ? cookies.join('; ') : '' }
  }, (res2) => {
    let body = ''; res2.on('data', d => body += d);
    res2.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const match = parsed.find(m => m.id === 'vps/open-router/stealth/ox-alpha');
        console.log('Model in /api/models:', !!match);
      } catch(e) { console.log('Error parsing JSON:', e.message, body.substring(0, 50)); }
    });
  });
});
req.write(JSON.stringify({ password: 'sheesh123' }));
req.end();
