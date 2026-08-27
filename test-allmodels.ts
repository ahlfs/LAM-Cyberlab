import { fetchConfiguredLiveModels } from './src/routes/api/models';
async function run() {
  const models = await fetchConfiguredLiveModels().catch(()=>[]);
  const match = models.find(m => m.id === 'open-router/stealth/ox-alpha' || m.id === 'vps/open-router/stealth/ox-alpha');
  console.log("MATCH:", match);
}
run();
