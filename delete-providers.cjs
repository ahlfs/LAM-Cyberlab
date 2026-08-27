const fs = require('fs')
const YAML = require('yaml')

const configPath = require('os').homedir() + '/.hermes/config.yaml'
const raw = fs.readFileSync(configPath, 'utf8')

// use YAML.parseDocument to preserve comments and formatting
const doc = YAML.parseDocument(raw)

// For `providers`
const providers = doc.get('providers')
if (providers && providers.items) {
  const toDelete = []
  for (const item of providers.items) {
    // Keep 'manifest' maybe? Let's just keep 'manifest' and nothing else, or delete all?
    // User said "semua provider kecuali lokal 9router 3035"
    if (item.key.value !== 'manifest') {
      toDelete.push(item.key.value)
    }
  }
  for (const key of toDelete) {
    providers.delete(key)
  }
}

// For `custom_providers`
const customProviders = doc.get('custom_providers')
if (customProviders && customProviders.items) {
  for (let i = customProviders.items.length - 1; i >= 0; i--) {
    const item = customProviders.items[i]
    const name = item.get('name')
    if (name !== 'Local (localhost:3035)') {
      customProviders.delete(i)
    }
  }
}

fs.writeFileSync(configPath, doc.toString(), 'utf8')
console.log('Successfully updated config.yaml')
