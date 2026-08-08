const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/routes/api/models.ts';
let content = fs.readFileSync(file, 'utf8');

// Add endpointProvider to the map inside fetchConfiguredLiveModels
content = content.replace(
  "provider: readString(entry.provider) || endpoint.provider,",
  "provider: readString(entry.provider) || endpoint.provider,\n            endpointProvider: endpoint.provider,"
);
fs.writeFileSync(file, content);
console.log("Patched models.ts");

const file2 = '/home/ahlfs/lam-cyberlab/src/routes/api/send-stream.ts';
let content2 = fs.readFileSync(file2, 'utf8');

// Use endpointProvider in send-stream.ts
content2 = content2.replace(
  "if (liveMatch && liveMatch.provider) {",
  "if (liveMatch && (liveMatch.endpointProvider || liveMatch.provider)) {"
);
content2 = content2.replace(
  "resolvedGatewayProvider = \\`custom:\\${liveMatch.provider.toLowerCase()}\\`",
  "resolvedGatewayProvider = \\`custom:\\${(liveMatch.endpointProvider || liveMatch.provider).toLowerCase()}\\`"
);

fs.writeFileSync(file2, content2);
console.log("Patched send-stream.ts");
