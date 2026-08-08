import { fetchConfiguredLiveModels } from './src/routes/api/models.ts';
async function run() {
  const requestModel = 'tamandata/cx/gpt-5.4-mini';
  const bareModel = 'cx/gpt-5.4-mini';
  const configuredLiveModels = await fetchConfiguredLiveModels();
  const liveMatch = configuredLiveModels.find((m) => {
    if (m.id === requestModel || m.id === bareModel) return true
    if (m.provider && requestModel === `${m.provider}/${m.id}`) return true
    if (m.provider && requestModel.startsWith(`${m.provider}/`) && requestModel.slice(m.provider.length + 1) === m.id) return true
    return false
  });
  console.log("liveMatch:", liveMatch);
  if (liveMatch) {
    console.log("localBaseUrl:", (liveMatch as any).baseUrl);
  }
}
run();
