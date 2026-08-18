// PM2 process file — OPTIONAL. Only needed if you want the workspace and
// the Hermes Agent dashboard running as permanent background services
// (survives closing the terminal, SSH disconnects, and reboots). Casual
// `pnpm dev` usage does not need this at all — see README.md
// "Running as a Permanent Server" for when this is actually worth setting up.
//
// The gateway (9router) is also included here so you can run everything
// (Workspace, Dashboard, and Gateway) with a single PM2 command.
//
// Usage:
//   pnpm build                    # one-time production build
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup       # survive reboots — pm2 startup prints a
//                                  # one-time sudo command to run
const os = require('os')
const path = require('path')
const fs = require('fs')

const homeDir = os.homedir()
const hermesPath = path.join(homeDir, '.hermes', 'hermes-agent', 'venv', 'bin', 'hermes')

// Read .env files for dynamic config
function readEnvFile(filePath) {
  const vars = {}
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      vars[key] = val
    }
  } catch (e) {}
  return vars
}

// Read workspace .env (for NINE_ROUTER_HOST toggle)
const workspaceEnv = readEnvFile(path.join(__dirname, '.env'))
const nineRouterHost = workspaceEnv.NINE_ROUTER_HOST || '127.0.0.1'

// Read hermes .env (for API_SERVER_ENABLED, API_SERVER_KEY, provider keys, etc.)
const hermesEnv = readEnvFile(path.join(homeDir, '.hermes', '.env'))

module.exports = {
  apps: [
    {
      name: 'lam-cyberlab-workspace',
      cwd: __dirname,
      script: 'server-entry.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'hermes-dashboard',
      script: hermesPath,
      args: 'dashboard --port 9119 --host 127.0.0.1 --no-open',
      interpreter: 'none',
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'hermes-gateway',
      script: hermesPath,
      args: 'gateway run',
      interpreter: 'none',
      env: hermesEnv,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: '9router',
      script: '/usr/local/bin/9router',
      args: `--host ${nineRouterHost} --tray`,
      interpreter: 'none',
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
}
