const fs = require('fs');
const file = '/home/ahlfs/lam-cyberlab/src/routes/api/send-stream.ts';
let content = fs.readFileSync(file, 'utf8');

// We need to resolve the provider for the Gateway if it's a custom model
const insertCode = `
        // Resolve Gateway Provider if it's a custom model (fixes routing when Gateway uses default provider)
        let resolvedGatewayProvider: string | undefined
        if (requestModel) {
          const configuredLiveModels = await fetchConfiguredLiveModels().catch(() => [])
          const liveMatch = configuredLiveModels.find((m) => {
            if (m.id === requestModel || m.id === bareModel) return true
            if (m.provider && requestModel === \`\${m.provider}/\${m.id}\`) return true
            if (m.provider && requestModel.startsWith(\`\${m.provider}/\`) && requestModel.slice(m.provider.length + 1) === m.id) return true
            return false
          })
          if (liveMatch && liveMatch.provider) {
             resolvedGatewayProvider = \`custom:\${liveMatch.provider.toLowerCase()}\`
          }
        }
`;

content = content.replace("let bareModel = requestModel.includes('/') ? requestModel.split('/').slice(1).join('/') : requestModel", 
"let bareModel = requestModel.includes('/') ? requestModel.split('/').slice(1).join('/') : requestModel\n" + insertCode);

content = content.replace("model: typeof body.model === 'string' ? body.model : undefined,", 
"model: typeof body.model === 'string' ? body.model : undefined,\n                provider: resolvedGatewayProvider || undefined,");

fs.writeFileSync(file, content);
console.log("Patched");
