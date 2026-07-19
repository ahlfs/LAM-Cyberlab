// PM2 process file — OPTIONAL. Only needed if you want the workspace and
// the Hermes Agent dashboard running as permanent background services
// (survives closing the terminal, SSH disconnects, and reboots). Casual
// `pnpm dev` usage does not need this at all — see README.md
// "Running as a Permanent Server" for when this is actually worth setting up.
//
// The gateway is deliberately NOT listed here — it already has its own
// native systemd/launchd service via `hermes gateway install`. Managing the
// same process with two supervisors at once causes more problems than it
// solves.
//
// Usage:
//   pnpm build                    # one-time production build
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup       # survive reboots — pm2 startup prints a
//                                  # one-time sudo command to run

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
      // Matches the exact invocation electron/main.cjs already uses to
      // auto-spawn the dashboard, for consistency across the codebase.
      script: 'hermes',
      args: 'dashboard --port 9119 --host 127.0.0.1 --no-open',
      interpreter: 'none',
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
}
