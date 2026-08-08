const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/server/claude-api.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "id?: string\n  title?: string\n  model?: string\n}): Promise<ClaudeSession> {",
  "id?: string\n  title?: string\n  model?: string\n  provider?: string\n}): Promise<ClaudeSession> {"
);
fs.writeFileSync(file, content);
console.log("Patched claude-api.ts");

const file2 = '/home/ahlfs/lam-cyberlab/src/routes/api/send-stream.ts';
let content2 = fs.readFileSync(file2, 'utf8');

// Also update createSession call
content2 = content2.replace(
  "const session = await createSession()",
  "const session = await createSession({\n                    model: typeof body.model === 'string' ? body.model : undefined,\n                    provider: resolvedGatewayProvider || undefined\n                  })"
);
fs.writeFileSync(file2, content2);
console.log("Patched send-stream.ts again");
