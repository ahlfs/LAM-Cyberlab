const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/routes/api/send-stream.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("bareModel = liveMatch.id", "bareModel = liveMatch.id || ''");

fs.writeFileSync(file, content);
console.log("Patched");
