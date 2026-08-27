import { fetchConfiguredLiveModels } from './src/routes/api/models.ts';
async function test() {
  const models = await fetchConfiguredLiveModels();
  console.log(models);
}
test();
