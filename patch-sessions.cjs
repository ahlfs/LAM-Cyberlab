const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/routes/api/sessions.ts';
let content = fs.readFileSync(file, 'utf8');

// Insert import if needed
if (!content.includes('fetchConfiguredLiveModels')) {
  content = content.replace(
    "import { createCapabilityUnavailablePayload, ensureGatewayProbed, getGatewayCapabilities } from '../../server/claude-api'",
    "import { createCapabilityUnavailablePayload, ensureGatewayProbed, getGatewayCapabilities } from '../../server/claude-api'\nimport { fetchConfiguredLiveModels } from './models'"
  );
}

const insertCode = `
          let resolvedGatewayProvider: string | undefined
          if (model) {
            const configuredLiveModels = await fetchConfiguredLiveModels().catch(() => [])
            const bareModel = model.includes('/') ? model.split('/').slice(1).join('/') : model
            const liveMatch = configuredLiveModels.find((m) => {
              if (m.id === model || m.id === bareModel) return true
              if (m.provider && model === \`\${m.provider}/\${m.id}\`) return true
              if (m.provider && model.startsWith(\`\${m.provider}/\`) && model.slice(m.provider.length + 1) === m.id) return true
              return false
            })
            if (liveMatch) {
               const prov = (liveMatch as any).endpointProvider || liveMatch.provider;
               if (prov) {
                  resolvedGatewayProvider = \`custom:\${prov.toLowerCase()}\`
               }
            }
          }
`;

content = content.replace(
  "const session = await createSession({",
  insertCode + "\n          const session = await createSession({"
);

content = content.replace(
  "title: label,\n            model,",
  "title: label,\n            model,\n            provider: resolvedGatewayProvider || undefined,"
);

fs.writeFileSync(file, content);
console.log("Patched sessions.ts");
