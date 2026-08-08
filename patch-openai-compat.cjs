const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/server/openai-compat-api.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "export type OpenAIChatOptions = {",
  "export type OpenAIChatOptions = {\n  apiKey?: string"
);
fs.writeFileSync(file, content);

const file2 = '/home/ahlfs/lam-cyberlab/src/routes/api/send-stream.ts';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
  "bareModel = liveMatch.id || '' || ''",
  "bareModel = liveMatch.id || ''"
);
fs.writeFileSync(file2, content2);
console.log("Patched");
