import { fetchConfiguredLiveModels } from './src/routes/api/models.ts';
async function run() {
  const models = await fetchConfiguredLiveModels();
  for (const m of models) {
    if (m.id.includes('tamandata') || m.id.includes('gpt-5.4')) {
      console.log(m.id, "=>", m.provider, " / endpointProvider:", (m as any).endpointProvider);
    }
  }
}
run();
