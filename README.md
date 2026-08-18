<div align="center">

<img src="./public/claude-avatar.webp" alt="LAM Cyberlab" width="80" style="border-radius: 16px" />
<!-- avatar filename retained for cache stability — do not rename without coordinated cache-bust -->

# LAM Cyberlab

**A unified Logic & Autonomous Model command center — seamlessly bridging agentic orchestration, dynamic memory, and comprehensive workspace controls into one interactive surface.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

> **Attribution & Architecture.** The base frontend codebase originated from [**Hermes Workspace**](https://github.com/outsourc-e/hermes-workspace) by outsourc-e. 
> Currently, 100% of this repository is independently maintained and developed by [ahlfs](https://github.com/ahlfs). 
> Please note that the "brain" and intelligence of LAM Cyberlab live 100% inside the backend [**Hermes Agent (Second Brain Edition)**](https://github.com/ahlfs/hermes-agent). 
> This repository (LAM Cyberlab) acts exclusively as the interactive frontend surface for that agent.

> Not just a chat wrapper. A complete digital laboratory — orchestrate AI agents, interact with your Second Brain, manage skills, and control everything from one interface, running seamlessly on top of your customized Hermes Agent backend.

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
- 🌐 **Graph** — Interactive 3D knowledge graph visualizer for your Second Brain
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

## 🚀 Deployment Options

Everything below installs and runs **this repository** (the web UI) which pairs with the backend agent.

### 📋 Requirements

Before starting, ensure you have the following installed on your system:

| Prerequisite | Version | Description |
|---|---|---|
| **Node.js** | 22+ | Required to run the Lam-Cyberlab web server. [Download Node.js](https://nodejs.org/) |
| **pnpm** | 9+ | Package manager (`npm install -g pnpm`). [Installation guide](https://pnpm.io/installation) |
| **Git** | latest | Required to clone this repository. [Download Git](https://git-scm.com/downloads) |
| **Hermes Agent** | modified fork | **CRITICAL:** You must use the modified fork of Hermes Agent for full compatibility. See instructions at [**ahlfs/hermes-agent**](https://github.com/ahlfs/hermes-agent). |

---

You can run LAM-Cyberlab in two ways depending on your needs:
1. **[Option A: Local Deployment](#-option-a-local-deployment-personal-computer)** — Best for local usage, testing, and development. Runs directly in your terminal.
2. **[Option B: Cloud VPS Deployment](#-option-b-cloud-vps-deployment-always-on)** — Best for a permanent, headless server. Uses PM2 to run quietly in the background.

---

### 💻 Option A: Local Deployment (Personal Computer)

#### 🐧 Linux (Debian / Ubuntu) & 🍎 macOS

**1. Install prerequisites** (Node.js 22+, pnpm, git) if you haven't already.

**2. Install and configure the custom `hermes-agent` (Second Brain Edition)**

Please refer to the documentation at [**ahlfs/hermes-agent**](https://github.com/ahlfs/hermes-agent) for detailed instructions on installing the agent, configuring OS dependencies for the Second Brain pipeline, and setting up environment variables.

**3. Clone Lam-Cyberlab and install dependencies**
```bash
git clone git@github.com:ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
pnpm install
```
*(If you don't use SSH keys, use: `https://github.com/ahlfs/LAM-Cyberlab.git`)*

**4. Configure the workspace**
Copy the example env file and set the token to match `API_SERVER_KEY` from your agent setup:
```bash
cp .env.example .env
cat >> .env <<'EOF'
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
HERMES_API_TOKEN=<must exactly match API_SERVER_KEY>
PORT=3000
EOF
```

**5. Start everything** (each in its own terminal):
```bash
# Terminal 1 — gateway
hermes gateway run

# Terminal 2 — dashboard (optional but highly recommended)
hermes dashboard

# Terminal 3 — the workspace
cd lam-cyberlab
pnpm dev
```
Open **http://127.0.0.1:3000** in your browser.

---

#### 🪟 Windows

**1. Install prerequisites** (PowerShell):
```powershell
# Node.js 22+
winget install OpenJS.NodeJS.LTS
# pnpm
npm install -g pnpm
```

**2. Install and configure the custom `hermes-agent`**

Please refer to the documentation at [**ahlfs/hermes-agent**](https://github.com/ahlfs/hermes-agent) for Windows installation instructions (note that the Second Brain pipeline requires WSL2). Make sure to configure `%LocalAppData%\hermes\.env` with your `API_SERVER_KEY`.

**3. Clone Lam-Cyberlab**
```powershell
git clone https://github.com/ahlfs/LAM-Cyberlab.git lam-cyberlab
cd lam-cyberlab
pnpm install
```

**4. Configure the workspace**
Copy `.env.example` to `.env` and configure the token to match `API_SERVER_KEY`:
```env
HERMES_API_URL=http://127.0.0.1:8642
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
HERMES_API_TOKEN=<must exactly match API_SERVER_KEY>
PORT=3000
```

**5. Start everything** (each in its own terminal):
```powershell
# Terminal 1 — gateway
hermes gateway run

# Terminal 2 — dashboard (optional but highly recommended)
hermes dashboard

# Terminal 3 — the workspace
cd C:\Users\<you>\lam-cyberlab
pnpm dev
```
Open **http://127.0.0.1:3000**.

> **Agent in WSL, workspace on native Windows?**
> Use the bundled helper script to launch without juggling terminals:
> `.\scripts\start-hermes-workspace.ps1`

---

#### Run without an open terminal (macOS/Linux)

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

LAM Cyberlab supports two modes with local models.

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

> [!WARNING]
> **Docker setup is currently NOT recommended for the Second Brain Edition.**
> The current `docker-compose.yml` pulls the vanilla `nousresearch/hermes-agent:latest` image for the backend. It does not yet use a custom image for the `ahlfs/hermes-agent` fork, meaning it lacks `ffmpeg`, `tesseract`, and the Second Brain ingestion scripts. 
> If you want to use the Second Brain capabilities (which is the core of this fork), please use the **Local Installation** method above.

Runs the **Hermes Agent gateway** (vanilla upstream image) and **LAM Cyberlab** (built from local source) in containers.

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

LAM Cyberlab is a **Progressive Web App (PWA)** — install it for the full native
app experience with no browser chrome, keyboard shortcuts, and offline support.

### 🖥️ Desktop (macOS / Windows / Linux)

1. Open LAM Cyberlab in **Chrome** or **Edge** at `http://localhost:3000`
2. Click the **install icon** (⊕) in the address bar
3. Click **Install** — LAM Cyberlab opens as a standalone desktop app
4. Pin to Dock / Taskbar for quick access

### 📱 iPhone / iPad (iOS Safari)

1. Open LAM Cyberlab in **Safari** on your iPhone
2. Tap the **Share** button (□↑)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

### 🤖 Android

1. Open LAM Cyberlab in **Chrome** on your Android device
2. Tap the **three-dot menu** (⋮) → **"Add to Home screen"**
3. Tap **Add**

---

## 📡 Mobile Access via Tailscale

Access LAM Cyberlab from anywhere on your devices — no port forwarding, no VPN complexity.

1. **Install Tailscale** on your server and your phone: [tailscale.com/download](https://tailscale.com/download)
2. **Sign in** to the same Tailscale account on both devices
3. **Find your server's Tailscale IP:**
   ```bash
   tailscale ip -4
   # Example output: 100.x.x.x
   ```
4. **Open LAM Cyberlab on your phone:** `http://100.x.x.x:3000`
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

### ☁️ Option B: Cloud VPS Deployment (Always-On)

If you are deploying this on a cloud VPS (e.g., Azure, DigitalOcean) and accessing it via an IP address over HTTP, follow this step-by-step guide to avoid common pitfalls like Gateway connection failures, 9router crash loops, and login loops.

We have provided an interactive bash script that automatically configures your environment variables, applies the necessary fixes for plain HTTP login loops, and sets up PM2 correctly for the Hermes Agent Gateway and LAM-Cyberlab Workspace.

```bash
cd ~/lam-cyberlab
./scripts/install-vps.sh
```

**What the script does:**
1. Prompts you for a secure API token and UI password.
2. Configures `~/.hermes/.env` (enabling `API_SERVER_ENABLED=true` so port 8642 opens).
3. Configures `lam-cyberlab/.env` (setting `COOKIE_SECURE=0` so you don't get stuck in an HTTP login loop).
4. Cleans up old orphaned gateways and builds the workspace.
5. Starts the entire stack via PM2 (`ecosystem.config.cjs`) using the correct environment injections.

Once the script completes, you can immediately open your browser to `http://YOUR-VPS-IP:3000` and login.

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

## 🧠 AI Second Brain

The **Second Brain** is a knowledge ingestion pipeline that turns raw captures (voice notes, documents, images) into a searchable, interlinked knowledge base.

Because this feature requires background processing and direct model access, **the Second Brain engine now runs entirely within the modified Hermes Agent** (the backend). Lam-Cyberlab serves as the frontend interface to visualize and interact with this knowledge.

### How it works
- **Ingestion & Consolidation:** Handled autonomously by the [modified `hermes-agent`](https://github.com/ahlfs/hermes-agent). It transcribes audio, extracts text from PDFs, and synthesizes them into durable facts and interlinked `[[wikilink]]` entity/concept pages.
- **Visualization:** Lam-Cyberlab provides the **Graph** page (`/graph`). It fetches the knowledge graph data from the backend and renders it as a lightweight, interactive 3D-projected force layout so you can visually explore how concepts connect.
- **Integration:** The agent reads these distilled facts on every session, making the AI "smarter" and more context-aware over time.

For setup instructions, vault structure, and configuration of the Second Brain engine, please refer directly to the backend repository: [**ahlfs/hermes-agent**](https://github.com/ahlfs/hermes-agent).

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
