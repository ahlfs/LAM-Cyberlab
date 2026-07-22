<div align="center">

<img src="./public/claude-avatar.webp" alt="Lam Cyberlab" width="80" style="border-radius: 16px" />
<!-- avatar filename retained for cache stability — do not rename without coordinated cache-bust -->

# Lam Cyberlab

**Personal AI agent command center — chat, files, memory, skills, terminal, link manager, and system monitoring in one place.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

> **Attribution.** Lam Cyberlab is a personal fork of
> [**Hermes Workspace**](https://github.com/outsourc-e/hermes-workspace) (MIT) by outsourc-e,
> which itself runs on vanilla [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent).
> Full credit for the original architecture and feature set goes to the upstream project;
> this fork is detached from upstream history and maintained independently by [ahlfs](https://github.com/ahlfs).
> Additions in this fork include the Dracula Soft theme pair, the `/system` host-monitor page,
> the `/links` personal link manager, and personal workflow docs — see
> [docs/PRD-workspace-additions.md](docs/PRD-workspace-additions.md).

> Not a chat wrapper. A complete workspace — orchestrate agents, browse memory, manage skills, and control everything from one interface, running on vanilla `hermes-agent` installed via Nous's own installer.

</div>

---

## Swarm Mode

Hermes Agent Swarm turns the workspace into a live control plane: unlimited Hermes Agents, 1 orchestrator, 0 humans manually dispatching.
Persistent tmux workers keep context across tasks, rotate safely, and report proof-bearing checkpoints.
Role-based dispatch routes builders, reviewers, docs, research, ops, triage, QA, and lab lanes without you having to be the task router.
A byte-verified review gate protects release branches before PRs ship.
Autonomous PR/issue lanes, lab experiments, and the repair playbook keep the machine moving while you handle judgment calls.

Start here: [docs/swarm/](./docs/swarm/)

- **Orchestrator Chat** — ask the control plane for one task, a decomposed mission, or a full broadcast.
- **Multi-Agent Control Plane** — see persistent Hermes Agents, roles, state, runtime, and routing wires in one surface.
- **Kanban TaskBoard** — plan backlog, ready, running, review, blocked, and done lanes without leaving the workspace.
- **Reports + Inbox** — review checkpoints, blockers, handoffs, and ready-for-human decisions.
- **TUI View built in** — attach to tmux-backed workers or fall back to a live shell/log stream.

---

## ✨ What's inside

- 💬 **Chat** — Real-time SSE streaming, tool call rendering, multi-session, markdown + syntax highlighting
- 🧠 **Memory** — Browse, search, and edit agent memory; markdown live editor
- 🔗 **Links** — Personal link manager: colored folders, favorites/archive/trash, search, visit/open stats
- 🖥️ **System** — Live host monitor: CPU (per-core), memory, disk, network, uptime
- 🧩 **Skills** — Browse 2,000+ skills with origin badges, filters, source paths, marketplace
- 🔌 **MCP** — Full /mcp page (catalog + marketplace + sources), or fallback to local config CRUD
- 📁 **Files + Terminal** — Full workspace file browser with Monaco; cross-platform PTY terminal
- 🎮 **Operations** — Multi-agent dashboard with profile presets (Sage/Trader/Builder/Scribe/Ops) and 'Needs setup' detection
- 📡 **Conductor** — Mission dispatch + decomposition with dashboard-backed missions when available and Workspace-native Swarm fallback otherwise
- 👥 **Agent View** — Live agent panel in chat with avatar, queue, history, usage meter
- 🐝 **Swarm Mode** — Persistent tmux-backed Hermes Agent workers with role-based dispatch
- 🗄️ **Dashboard** — Aggregated overview: sessions, model mix, cost ledger, attention card, ops strip
- 🎨 **Themes** — 7 palettes × light/dark (14 total): Nous, Hermes, Bronze, Slate, Matrix, SciFi, Dracula Soft
- 🔒 **Security** — Auth middleware on every route, CSP, path-traversal guard, fail-closed remote bind
- 📱 **PWA + Tailscale** — Install as a native-feeling app; access from any device on your tailnet
- 🖥️ **Desktop app** — Electron build for macOS / Windows / Linux (see [Native Desktop App](#-native-desktop-app))
- ⚙️ **Capability gates** — Features that need upstream endpoints (Conductor) show a clean placeholder instead of failing mid-action

---

## 📸 Screenshots

This fork looks meaningfully different from stock Hermes Workspace (new theme, new
pages), so the old marketing screenshots were removed rather than left showing the
wrong UI. Screenshots of this instance haven't been captured yet — the easiest way
to add them:

1. Run the workspace locally (see [Getting Started](#-getting-started) below).
2. Screenshot `/dashboard`, `/chat`, `/links`, and `/system` in your favorite theme.
3. Drop the images in `docs/screenshots/` and link them here.

---

## 🚀 Getting Started

Everything below installs and runs **this repository**, end to end, on a fresh
machine. Pick your OS section; all three converge on the same two things running
side by side:

- **`hermes-agent`** — the agent backend/brain (a separate project by Nous Research), exposing an HTTP gateway on port `8642`.
- **This repo (Lam Cyberlab)** — the web UI, served on port `3000`.

### Prerequisites (all platforms)

- **Node.js 22+** — [nodejs.org](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm` (or `corepack enable`)
- **git**
- **Python 3.11+** — only needed if you run `hermes-agent` locally (the typical case)

---

### 🐧 Linux (Debian / Ubuntu and derivatives)

**1. Install Node.js 22+ and pnpm**, if you don't have them already:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

**2. Install `hermes-agent`** via Nous's official installer:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

**3. Configure a model provider**, then confirm it works:

```bash
hermes setup      # pick a provider (OpenRouter, OpenAI, Gemini, Ollama, ...) and a model
```

**4. Enable the gateway's HTTP API.** This is opt-in and easy to miss — without it,
the gateway only serves messaging platforms (Telegram, etc.), not port `8642`.
Edit `~/.hermes/.env` and add:

```env
API_SERVER_ENABLED=true
API_SERVER_KEY=<a random secret — e.g. output of: openssl rand -hex 32>
```

**5. Start the gateway** (leave this running in its own terminal, or see
[running without an open terminal](#run-without-an-open-terminal) below for a
systemd service):

```bash
hermes gateway run
```

Verify it's up: `curl http://127.0.0.1:8642/v1/models` should return JSON (401 is
fine too — that just means auth is on and working).

**6. Clone this repo and install dependencies**, in a new terminal:

```bash
git clone git@github.com:ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
pnpm install
```

(Use the HTTPS URL instead if you haven't set up an SSH key with GitHub:
`https://github.com/ahlfs/LAM-Cyberlab.git`.)

**7. Configure the workspace.** Copy the example env file and set the token to
match `API_SERVER_KEY` from step 4:

```bash
cp .env.example .env
cat >> .env <<'EOF'
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_TOKEN=<same value as API_SERVER_KEY above>
EOF
```

**8. Run it:**

```bash
pnpm dev
```

Open **http://localhost:3000** — the onboarding screen should detect the gateway
automatically. If it says "No compatible backend detected," re-check steps 4–5
(the single most common miss is forgetting `API_SERVER_ENABLED=true`).

---

### 🍎 macOS

Same flow as Linux, with Homebrew for the two system dependencies:

```bash
# 1. Node.js 22+ and pnpm
brew install node@22
npm install -g pnpm

# 2. hermes-agent via Nous's official installer
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# 3. Configure a provider
hermes setup

# 4. Enable the gateway's HTTP API — edit ~/.hermes/.env and add:
#      API_SERVER_ENABLED=true
#      API_SERVER_KEY=<openssl rand -hex 32>

# 5. Start the gateway (own terminal / tab)
hermes gateway run

# 6. Clone and install this repo, in a new terminal
git clone git@github.com:ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
pnpm install

# 7. Configure the workspace
cp .env.example .env
cat >> .env <<'EOF'
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_TOKEN=<same value as API_SERVER_KEY above>
EOF

# 8. Run it
pnpm dev
```

Open **http://localhost:3000**. To run without an open Terminal window, see
[running without an open terminal](#run-without-an-open-terminal) (launchd on
macOS), or install the [desktop app](#-native-desktop-app).

---

### 🪟 Windows

Windows has a genuine native path (no WSL required) — `hermes-agent` ships a
Windows-native config layout. Three services end up running: the **gateway**
(`:8642`), the **dashboard** (`:9119`, optional but unlocks more features), and
the **workspace** (`:3000`).

**1. Install prerequisites** (PowerShell):

```powershell
# Node.js 22+ — download the installer from nodejs.org, or via winget:
winget install OpenJS.NodeJS.LTS

# pnpm
npm install -g pnpm

# Claude CLI (only needed if you use Claude Tasks / Conductor)
npm install -g @anthropic-ai/claude-code

# sqlite3 CLI (needed for kanban/tasks)
winget install SQLite.SQLite --accept-package-agreements --accept-source-agreements
# then copy sqlite3.exe from the WinGet packages folder into a directory on your PATH
```

**2. Install `hermes-agent`** — follow Nous's official Windows installation
instructions for [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent).
(If you'd rather install it inside WSL2/Ubuntu instead, follow the Linux section
above inside your WSL shell — either path works, they just place config files
in different locations.)

**3. Configure the gateway.** Edit `%LocalAppData%\hermes\.env`
(`C:\Users\<you>\AppData\Local\hermes\.env`) and add:

```env
OPENROUTER_API_KEY=<your-key>
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_KEY=<a random secret>
```

Mirror the same keys in `C:\Users\<you>\.hermes\.env` (the CLI tools read from here).

**4. Clone this repo:**

```powershell
git clone https://github.com/ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
pnpm install
```

**5. Configure the workspace.** Copy `.env.example` to `.env` and set:

```env
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
HERMES_API_TOKEN=<must exactly match API_SERVER_KEY above>
PORT=3000
```

**6. Start everything**, each in its own terminal:

```powershell
# Terminal 1 — gateway
hermes gateway run

# Terminal 2 — dashboard (optional, but unlocks Sessions/Skills/Config/Jobs)
hermes dashboard

# Terminal 3 — the workspace
cd C:\Users\<you>\lam-cyberlab
pnpm dev
```

Open **http://127.0.0.1:3000**.

**Port already in use?**

```powershell
netstat -ano | findstr :8642
Stop-Process -Id <PID> -Force
```

**Prefer one command instead of three terminals?** Install the
[desktop app](#-native-desktop-app) — the Electron build auto-starts the gateway
and dashboard for you. Full reference: [`docs/windows-setup-guide.md`](docs/windows-setup-guide.md).

**Agent in WSL, workspace on native Windows?** Use the bundled helper instead of
juggling terminals by hand:

```powershell
.\scripts\start-hermes-workspace.ps1
# .\scripts\start-hermes-workspace.ps1 -Restart   # force a clean relaunch
```

Optional flags: `-Distro <name>` for a non-default WSL distro, `-WorkspacePath <path>`
if your WSL clone isn't at `~/lam-cyberlab`, `-SessionName <name>` for a custom
tmux session name.

---

### Run without an open terminal

Once things work with `pnpm dev`, install Workspace as a background service
(launchd on macOS, systemd on Linux) instead of leaving a terminal open:

```bash
pnpm build
chmod +x scripts/install-dashboard-service.sh
scripts/install-dashboard-service.sh
```

See [`docs/dashboard-service.md`](docs/dashboard-service.md) for logs, overrides,
and uninstall steps. On Windows, use the [desktop app](#-native-desktop-app) instead.

---

### Environment variables reference

```env
# Where the gateway is (required)
HERMES_API_URL=http://127.0.0.1:8642

# Where the dashboard is (recommended — unlocks sessions/skills/config/MCP/jobs)
HERMES_DASHBOARD_URL=http://127.0.0.1:9119

# Only if your gateway was started with API_SERVER_KEY=... — paste the same value:
# HERMES_API_TOKEN=***

# Optional: password-protect the web UI
# HERMES_PASSWORD=your_password

# Optional: provider keys the Hermes Agent gateway can read at runtime
# (you only need the key for whichever provider you actually use — set these
# in ~/.hermes/.env on the agent side, not necessarily here)
# OPENAI_API_KEY=sk-...
# OPENROUTER_API_KEY=sk-or-v1-...
# GOOGLE_API_KEY=AIza...
```

See `.env.example` in this repo for the full annotated list.

---

## 🧠 Local Models (Ollama, LM Studio, vLLM, and friends)

Lam Cyberlab supports two modes with local models.

### Portable Mode (Easiest)

Point the workspace directly at your local server — no Hermes Agent gateway needed.

```bash
# Start Ollama with CORS enabled
OLLAMA_ORIGINS=* ollama serve

# Start the workspace pointed at it
HERMES_API_URL=http://127.0.0.1:11434 pnpm dev
```

Chat works immediately. Sessions, memory, and skills show "Not Available" — that's
expected in portable mode; any OpenAI-compatible local server works the same way
(swap the URL and port).

### Enhanced Mode (Full Features)

Route through the Hermes Agent gateway for sessions, memory, skills, jobs, and tools.
Example `~/.hermes/config.yaml` for Ollama:

```yaml
provider: ollama
model: qwen3:32b
custom_providers:
  - name: ollama
    base_url: http://127.0.0.1:11434/v1
    api_key: ollama
    api_mode: chat_completions
```

Then, with `API_SERVER_ENABLED=true` set in `~/.hermes/.env` (see
[Getting Started](#-getting-started) above):

```bash
hermes gateway run          # :8642
hermes dashboard            # :9119
HERMES_API_URL=http://127.0.0.1:8642 \
HERMES_DASHBOARD_URL=http://127.0.0.1:9119 \
pnpm dev
```

All workspace features unlock automatically once both services are reachable.

---

## 🤝 Pairing the Workspace with the Agent

Workspace is the UI. **Hermes Agent** is the brain. They talk over two HTTP
services on localhost (or any reachable network):

```
┌───────────────┐         :8642 gateway          ┌────────────────┐
│   Workspace    │ ─────────────────────▶ │  Hermes Agent  │
│   :3000 (UI)   │ ◀───────────────────── │  CLI / brain   │
└───────────────┘         :9119 dashboard        └────────────────┘
```

### Running on a remote host (Tailscale / VPN / LAN)

If the workspace and its browser live on different machines — e.g. the workspace
runs on a home server and you open it from your phone over Tailscale — point
`HERMES_API_URL` at the **reachable** address, not `127.0.0.1`:

```bash
# On the machine running the workspace + gateway:
echo 'HERMES_API_URL=http://100.x.y.z:8642' >> .env
echo 'HERMES_DASHBOARD_URL=http://100.x.y.z:9119' >> .env

# Tell the gateway to listen on all interfaces:
echo 'API_SERVER_HOST=0.0.0.0' >> ~/.hermes/.env
```

Restart the gateway, dashboard, and workspace. Both URLs must point at the
Tailscale/LAN address — setting only one leaves the other probing `127.0.0.1`.

**Already running?** Change either URL from **Settings → Connection** without
restarting — values persist to `~/.hermes/workspace-overrides.json`.

### Verify the pairing

```bash
curl http://127.0.0.1:8642/health        # → {"status":"ok","platform":"hermes-agent"}
curl http://127.0.0.1:9119/api/status    # → {"status":"ok", ...}
```

If either fails, the workspace falls back to **portable mode** (chat works,
sessions/skills/memory show "Not Available").

### Troubleshooting

- **"No compatible backend detected"** — the single most common cause: `API_SERVER_ENABLED=true` is missing from `~/.hermes/.env`. Add it, restart the gateway (`hermes gateway run`), and retry.
- **`Could not reach Hermes gateway`** — gateway isn't running, or `HERMES_API_URL` points somewhere unreachable. Run `hermes gateway run` and re-check.
- **Workspace shows "portable mode" / extended APIs missing** — the dashboard isn't running. Start `hermes dashboard` and refresh.
- **`Unauthorized` on every API call** — the gateway has `API_SERVER_KEY` set but the workspace is missing `HERMES_API_TOKEN`, or the two values don't match exactly.
- **Sessions probe says unavailable but pairing should be live** — check `curl http://localhost:3000/api/connection-status` before starting a second gateway. If it returns `"status":"connected"`, the backend is alive and the UI just needs a refresh.
- **Ollama: chat returns empty or model shows "Offline"** — make sure `~/.hermes/config.yaml` has the `custom_providers` section, `API_SERVER_ENABLED=true` is set, and Ollama itself is running with `OLLAMA_ORIGINS=*`. Use `127.0.0.1` (not `localhost`) in the base URL.
- **`Could not connect` from your phone over Tailscale** — the gateway is bound to loopback. Set `API_SERVER_HOST=0.0.0.0` in `~/.hermes/.env` and restart it.

**Conductor note:** when the dashboard mission API is available, Workspace uses it
directly. When absent, Workspace falls back to its native Swarm dispatch
(`mode: native-swarm`) through Workspace Swarm workers.

---

## 🐳 Docker

Runs both the **Hermes Agent gateway** and **Lam Cyberlab** in containers, built
from this repo's own source (there's no published container image for a personal
fork, so this always builds locally rather than pulling someone else's image).

```bash
git clone git@github.com:ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
cp .env.example .env
```

Edit `.env` and add **at least one** LLM provider key — whichever provider you
want `hermes-agent` to use:

```env
# Pick one (or more). You do NOT need all of these.
# OPENAI_API_KEY=sk-...
# OPENROUTER_API_KEY=sk-or-v1-...
# GOOGLE_API_KEY=AIza...
```

Using Ollama, LM Studio, or another local server instead? No key needed — point
`hermes-agent` at it via the onboarding flow.

Build and start (this compiles *this repo's* code into the workspace image,
rather than pulling a prebuilt one):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Open `http://localhost:3000` and complete onboarding. Check the logs for
`[gateway] Connected to Hermes Agent` to confirm the pairing worked.

### Remote access (LAN / Tailscale / VPN)

The default compose file binds to `127.0.0.1` only. To expose it on your network:

**1. Publish ports without the loopback restriction** — create `docker-compose.override.yml`:

```yaml
services:
  hermes-agent:
    ports:
      - '8642:8642'
  hermes-workspace:
    ports:
      - '3000:3000'
```

**2. Add to `.env`:**

```env
HERMES_PASSWORD=your-strong-secret-here   # required — refuses to bind 0.0.0.0 without it
COOKIE_SECURE=0                           # required for plain-HTTP LAN access
API_SERVER_KEY=***                        # recommended — gateway auth on your LAN
GATEWAY_ALLOW_ALL_USERS=true              # only if the gateway refuses to start otherwise
```

**3. Restart:**

```bash
docker compose down && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

> **HTTPS behind a reverse proxy?** Set `COOKIE_SECURE=1` instead and add `TRUST_PROXY=1`.

### Docker troubleshooting

| Symptom | Fix |
|---|---|
| `[workspace] refusing to start — HERMES_PASSWORD is unset` | Add `HERMES_PASSWORD=<secret>` to `.env` |
| Login silently fails (no error, page reloads) | Add `COOKIE_SECURE=0` for HTTP, or `COOKIE_SECURE=1` + HTTPS |
| `[Api_Server] Refusing to start: binding to 0.0.0.0 requires API_SERVER_KEY` | Add `API_SERVER_KEY=***` to `.env` |
| `No user allowlists configured` | Add `GATEWAY_ALLOW_ALL_USERS=true` to `.env` |
| "Unauthorized" / "Connection refused" to hermes-agent | Check a provider key is set (`grep _API_KEY .env`), then `docker compose logs hermes-agent` |
| 500 error on login after fixing the above | Clear browser cookies for the workspace domain, retry |

---

## 📱 Install as App (Recommended)

Lam Cyberlab is a **Progressive Web App (PWA)** — install it for the full native
app experience with no browser chrome, keyboard shortcuts, and offline support.

### 🖥️ Desktop (macOS / Windows / Linux)

1. Open Lam Cyberlab in **Chrome** or **Edge** at `http://localhost:3000`
2. Click the **install icon** (⊕) in the address bar
3. Click **Install** — Lam Cyberlab opens as a standalone desktop app
4. Pin to Dock / Taskbar for quick access

### 📱 iPhone / iPad (iOS Safari)

1. Open Lam Cyberlab in **Safari** on your iPhone
2. Tap the **Share** button (□↑)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

### 🤖 Android

1. Open Lam Cyberlab in **Chrome** on your Android device
2. Tap the **three-dot menu** (⋮) → **"Add to Home screen"**
3. Tap **Add**

---

## 📡 Mobile Access via Tailscale

Access Lam Cyberlab from anywhere on your devices — no port forwarding, no VPN complexity.

1. **Install Tailscale** on your server and your phone: [tailscale.com/download](https://tailscale.com/download)
2. **Sign in** to the same Tailscale account on both devices
3. **Find your server's Tailscale IP:**
   ```bash
   tailscale ip -4
   # Example output: 100.x.x.x
   ```
4. **Open Lam Cyberlab on your phone:** `http://100.x.x.x:3000`
5. **Add to Home Screen** using the steps above for the full app experience

> Tailscale works over any network — home wifi, mobile data, even across countries. Your traffic stays end-to-end encrypted.

---

## 🖥️ Native Desktop App

An Electron desktop build ships in this repo (macOS / Windows / Linux) —
auto-spawns the gateway and dashboard for you, no terminal needed.

```bash
pnpm electron:dev            # run in dev mode
pnpm electron:build          # build a distributable for your current OS
pnpm electron:build:win      # Windows installer (NSIS + portable)
pnpm electron:build:mac      # macOS .dmg
```

Built installers land in `release/`. This fork's link manager (`/links`) uses
SQLite (`better-sqlite3`), the one native dependency in the project — the desktop
build pipeline rebuilds it against Electron's own Node ABI automatically
(`pnpm electron:rebuild-native`, wired into every `electron:build*` script). If
you switch back to `pnpm dev` after building the desktop app, run
`pnpm electron:restore-native` once to restore the binary `pnpm dev` needs.

For now, [installing as a PWA](#-install-as-app-recommended) is the lower-friction
option for most people — the desktop build is there for anyone who wants a real
installer.

---

## 🚀 Running as a Permanent Server

**This is entirely optional.** `pnpm dev` + `hermes gateway run` in two terminals
(the default flow above) is all you need to try this out or actively develop
against it — nothing here changes that. This section is for when you want the
workspace running unattended: a VPS, a home server, or anywhere you want it to
survive closing the terminal, an SSH disconnect, or a reboot — which matters in
particular once you turn on **Remote Access** (Settings → Remote Access in the
sidebar) — a public URL is only useful if something is actually listening on
the other end of it.

Three processes are involved, and they're deliberately supervised in two
different ways rather than shoving everything into one tool:

| Process | Supervised by | Why |
|---|---|---|
| Hermes Agent gateway | systemd/launchd, via `hermes gateway install` | Native to hermes-agent itself — already the officially-supported way to keep it running. |
| Hermes Agent dashboard | pm2 | Has no built-in service-install command of its own; this is the gap pm2 fills. |
| Lam Cyberlab workspace | pm2 | A plain Node process — pm2 is the standard tool for this. |

Running the gateway under both systemd *and* pm2 would mean two supervisors
fighting over the same process, so it stays on its native systemd unit.

### Setup

```bash
# 1. Gateway as a systemd/launchd service (hermes-agent's own command)
hermes gateway install

# 2. Production build of the workspace (pm2 runs the built output, not `pnpm dev`)
pnpm build

# 3. Install pm2 (global, not a project dependency)
npm install -g pm2

# 4. Start the dashboard + workspace under pm2
pnpm pm2:start
# equivalent to: pm2 start ecosystem.config.cjs

# 5. Persist across reboots
pm2 save
pm2 startup      # prints a one-time sudo command — run exactly what it prints
```

`ecosystem.config.cjs` (repo root) defines the two pm2-managed apps —
`hermes-dashboard` (`hermes dashboard --port 9119 --host 127.0.0.1 --no-open`,
the same invocation the Electron desktop build already uses to auto-spawn it)
and `lam-cyberlab-workspace` (`node server-entry.js` in production mode). The
workspace still reads all its configuration from `.env` as usual — `pm2:start`
doesn't duplicate or override any of it.

### Day-to-day

```bash
pnpm pm2:status      # is everything up?
pnpm pm2:logs        # tail logs for both apps
pnpm pm2:restart     # e.g. after `pnpm build` picks up new code
systemctl --user status hermes-gateway.service   # gateway is separate, check it separately
```

### Updating the workspace code

Since pm2 runs the *built* output, pulling new code needs a rebuild before it
takes effect:

```bash
git pull
pnpm install
pnpm build
pnpm pm2:restart
```

---

## 🔒 Security & deployment env vars

Key safeguards — most are on by default, the env vars below are for remote /
Docker deployments where you opt out of the loopback default.

**Prefer a guided flow?** Open **Remote Access** in the sidebar — it sets the
password and the expose toggle for you (writes `.env`, no manual editing),
shows whether the current bind is pending a restart, and includes a DNS
checker + copy-pasteable command for putting [Caddy](https://caddyserver.com)
in front of a custom domain (`scripts/setup-remote-access.sh`, run yourself in
a terminal — it needs root to install packages, so it's never triggered from
the web UI). The env vars below are what that page manages under the hood.

### Built-in safeguards

- Auth middleware on every API route
- CSP headers via meta tags
- Path-traversal prevention on file/memory routes (real-path boundary check, not string prefix)
- Rate limiting on endpoints
- Fail-closed startup guard: refuses to bind non-loopback without `HERMES_PASSWORD`
- Session cookies: `HttpOnly` + `SameSite=Strict` + `Secure` (in production)
- Optional password protection for the web UI

### Env vars for remote / Docker deployments

- `HERMES_PASSWORD` — required whenever `HOST ≠ 127.0.0.1`
- `COOKIE_SECURE=1` — force the `Secure` cookie flag when terminating HTTPS at a proxy
- `COOKIE_SECURE=0` — disable the `Secure` flag for plain-HTTP LAN deployments; without this, browsers silently drop session cookies and login fails
- `TRUST_PROXY=1` — trust `x-forwarded-for` / `x-real-ip` (only set behind a sanitizing reverse proxy)
- `HERMES_DASHBOARD_TOKEN` — explicit bearer for dashboard API
- `HERMES_API_TOKEN` — bearer for the Hermes Agent gateway when started with `API_SERVER_KEY`
- `HERMES_ALLOW_INSECURE_REMOTE=1` — bypass the fail-closed guard (not recommended)

See `.env.example` for the full list.

---

## 🧠 AI Second Brain (optional add-on)

An **optional** pipeline that turns raw captures — voice notes, meeting
recordings, PDFs, images — into a searchable, interlinked Obsidian knowledge
base, and feeds durable facts back into Hermes Agent so it gets more useful
the more you use it. It's completely separate from the core workspace: the
app runs fully without any of this, and none of it is needed to chat.

> **Heads-up on setup difficulty:** unlike the core app, this add-on needs
> Python, an Obsidian vault, and (for the AI passes) a working `hermes`
> model with API credits. It's an "advanced" feature — see the caveats at
> the end of this section.

### The vault

Lives **outside** this repo at `~/obsidian/memo/` (so `git` operations on
the repo can never touch your recordings/notes). Open that folder as a vault
in the [Obsidian](https://obsidian.md) app. Structure:

```
~/obsidian/memo/
├── 01-Audio/            drop recordings here (.mp3/.wav/.m4a)
├── 02-Documents/        drop PDFs / images here
├── 03-Notes/
│   ├── Transcripts/     generated transcripts
│   └── Extracted-Docs/  generated text extractions
├── 04-Wiki/             AI-maintained wiki (Entities/ + Concepts/, index, log)
├── WIKI_SCHEMA.md       conventions the wiki follows
└── AI_CONTEXT.md        read this first — full structure + limitations
```

### One-time setup

```bash
# Isolated Python env (this repo's system pip is PEP 668-locked)
uv venv .venv-second-brain
uv pip install -r requirements-second-brain.txt --python .venv-second-brain

# Optional: image OCR needs the tesseract binary (needs sudo)
sudo apt install tesseract-ocr    # skip if you don't ingest images
```

The AI passes (memory + wiki) reuse your **existing** `hermes` model and
credentials — no separate API key. Verify `hermes` is configured (`hermes status`).

### Daily use

Drop files into `01-Audio/` or `02-Documents/`, then:

```bash
./scripts/sync-second-brain.sh
```

Runs five idempotent passes (safe to re-run — only new/changed files are
processed):

| Pass | Script | Cost | What it does |
|---|---|---|---|
| 1 Audio | `ingest_audio.py` | free, local | transcribe audio → `03-Notes/Transcripts/` (faster-whisper) |
| 2 Docs | `ingest_docs.py` | free, local | extract PDF/image text → `03-Notes/Extracted-Docs/` (pypdf / tesseract) |
| 3 Memory | `consolidate_memory.py` | **tokens** | agent saves durable facts into `MEMORY.md`/`USER.md` (read every chat session) |
| 4 Wiki | `wiki_ingest.py` | **tokens** | agent builds interlinked `[[wikilink]]` entity/concept pages in `04-Wiki/` |
| 5 Graph | `graphify update .` | free, local | refresh the **code** graph (does not touch the vault) |

Passes 1, 2, 5 are free (run locally). Passes 3 and 4 call the LLM, so they
consume tokens on whatever provider `hermes` uses.

### How it makes the AI "smarter"

- **Pass 3 (memory)** is the direct path: Hermes Agent already reads
  `MEMORY.md`/`USER.md` into context on every session, so facts distilled
  from your notes surface automatically in later chats.
- **Pass 4 (wiki)** is the Karpathy "LLM wiki" pattern: notes are synthesized
  into interlinked entity/concept pages, so Obsidian's Graph View actually
  connects and knowledge compounds. The agent proposes pages as JSON; the
  script does all file writes with strict path validation (pages can only
  ever land inside `04-Wiki/`), so a malicious note can't escape the vault.

### Caveats (read these)

- **The AI passes cost tokens** and require a configured `hermes` provider
  with credits. Quality is LLM-judgment — spot-check `MEMORY.md` and the
  wiki occasionally.
- **Not real-time.** Notes only update when you run the sync script; a new
  recording sits unprocessed until then.
- **Image OCR / scanned PDFs** need `tesseract` (Linux, `sudo`); without it,
  images are skipped with a clear message.
- **No mid-chat retrieval (RAG).** The vault feeds the AI via memory (pass 3),
  not by searching the vault live during a conversation. That's a deliberate
  scope choice — see `~/obsidian/memo/AI_CONTEXT.md` for the reasoning.
- Override the vault location with the `SECOND_BRAIN_VAULT` env var; override
  the model used for the AI passes with `HERMES_WIKI_MODEL` /
  `HERMES_CONSOLIDATE_*` (e.g. point them at a cheaper model to save cost).

---

## 🗺️ Roadmap

### Shipped ✅

| Feature | What it does |
|---|---|
| Chat + SSE streaming | Live agent output with tool call rendering |
| Links | Personal link manager: folders, favorites/archive/trash, search, stats |
| System monitor | Live CPU/memory/disk/network/uptime page |
| Files + Terminal | Full workspace file browser + cross-platform PTY |
| Memory + Skills browsers | Edit memory, browse 2,000+ skills with marketplace |
| Dashboard | Sessions, model mix, cost ledger, attention card |
| Operations | Multi-agent management with preset personas |
| Agent View | Live agent panel in chat |
| Swarm Mode | Persistent tmux-backed worker pool with role dispatch |
| MCP page | Full catalog + marketplace + sources |
| Mobile PWA + Tailscale | Install as native-feeling app on any device |
| Desktop app | Electron build for macOS / Windows / Linux |
| Themes | 7 palettes × light/dark: Nous, Hermes, Bronze, Slate, Matrix, SciFi, Dracula Soft |
| Capability gates | Graceful 'upstream not ready' placeholders |
| Multi-provider | OpenAI/OpenAI-compatible, OpenRouter, Google, Ollama, LM Studio, vLLM, and other Hermes-supported providers |
| Remote Access | Guided public IP/domain exposure with mandatory password + Caddy HTTPS setup |
| Backup & Restore | One-click export/import of Links, Memory, and settings |
| Permanent server (pm2) | Optional always-on background service setup for VPS/home-server use |

### Planned

See [docs/PRD-workspace-additions.md](docs/PRD-workspace-additions.md) for this
fork's own roadmap (accessibility contrast pass, Linku data import, and whatever
comes next).

---

## 🤝 Contributing

This is a personal, self-hosted instance — not actively seeking outside
contributors — but the repo is public under MIT, so issues and PRs are welcome
if something's useful to you too. See [CONTRIBUTING.md](CONTRIBUTING.md) for
guidelines and [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details. Substantial portions originate from
[Hermes Workspace](https://github.com/outsourc-e/hermes-workspace) by outsourc-e
(also MIT) — see the attribution note at the top of this file.

---

<div align="center">
  <sub>Maintained by <a href="https://github.com/ahlfs">@ahlfs</a> · based on Hermes Workspace by <a href="https://github.com/outsourc-e">@outsourc-e</a></sub>
</div>
