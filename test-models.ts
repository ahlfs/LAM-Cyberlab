import { fetchConfiguredLiveModels } from './src/routes/api/models.ts';
async function run() {
  const models = await fetchConfiguredLiveModels();
  const m = models.find(x => x.id.includes('tamandata'));
  console.log("Match:", m);
  if (m) {
    const prov = (m as any).endpointProvider || m.provider;
    console.log("Resolved:", `custom:${prov.toLowerCase()}`);
  }
}
run();
