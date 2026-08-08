import { fetchConfiguredLiveModels } from './src/routes/api/models.ts';
import { readConfiguredLiveModelEndpoints } from './src/routes/api/models.ts';
async function run() {
  const requestModel = 'tamandata/cx/gpt-5.4-mini';
  const bareModel = 'cx/gpt-5.4-mini';
  const configuredLiveModels = await fetchConfiguredLiveModels();
  
  let localBaseUrl;
  const liveMatch = configuredLiveModels.find((m) => {
    if (m.id === requestModel || m.id === bareModel) return true
    if (m.provider && requestModel === `${m.provider}/${m.id}`) return true
    if (m.provider && requestModel.startsWith(`${m.provider}/`) && requestModel.slice(m.provider.length + 1) === m.id) return true
    return false
  });
  if (liveMatch && typeof (liveMatch as any).baseUrl === 'string') {
    localBaseUrl = (liveMatch as any).baseUrl;
  }
  
  if (!localBaseUrl) {
    const liveEndpoints = readConfiguredLiveModelEndpoints()
    for (const endpoint of liveEndpoints) {
      if (
        requestModel.startsWith(`${endpoint.provider}/`) ||
        requestModel.startsWith(`${endpoint.provider}:`)
      ) {
        localBaseUrl = endpoint.baseUrl
        break
      }
    }
  }
  
  console.log("localBaseUrl:", localBaseUrl);
}
run();
