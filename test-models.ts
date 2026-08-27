import { fetchConfiguredLiveModels, readClaudeConfigCatalog } from './src/routes/api/models'

async function run() {
  const live = await fetchConfiguredLiveModels()
  const catalog = readClaudeConfigCatalog()
  console.log("LIVE:", live.filter(m => m.id.includes('claude-sonnet')))
  console.log("CATALOG:", catalog.filter(m => m.id.includes('claude-sonnet')))
}
run()
