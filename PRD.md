# Product Requirements Document (PRD): Lam-Cyberlab

## 1. Project Overview
**Lam-Cyberlab** adalah modifikasi independen (fork) dari proyek *open-source* `hermes-workspace`. Proyek ini bertujuan untuk membangun pusat komando (Command Center) agen AI personal yang bertindak sebagai *Omnichannel UI Client* (antarmuka visual yang bisa disandingkan dengan klien lain, seperti Bot Telegram). 

Visi utama proyek ini adalah menjadikannya sistem yang **"Plug and Play"** di lingkungan *Virtual Private Server* (VPS) *headless* (tanpa GUI), dengan sistem konfigurasi tersentralisasi yang mendelegasikan 100% beban komputasi AI (termasuk skrip pengolahan memori) ke *Hermes Agent*.

## 2. Core Objectives
1. **Easy to Setup (Clone & Run)**: Meminimalisir langkah instalasi manual antarmuka. Cukup jalankan satu skrip atau gunakan Docker, dan Web UI langsung siap melayani.
2. **Highly Dynamic Configuration**: Menghilangkan seluruh *hardcode* di dalam *source code*. Semua *path* direktori dan preferensi sistem dikonfigurasi lewat satu file `.env`.
3. **Headless VPS Optimized**: Berfokus murni pada aplikasi *Web Server*, memangkas beban modul *desktop/GUI* (seperti Electron) saat berjalan di peladen (namun tetap bisa dikompilasi ke lokal bila dibutuhkan).
4. **Clean Code Architecture**: Memastikan basis kode terstruktur, modular, dan bersih.
5. **Strict Client-Gateway Separation**: Workspace Lam-Cyberlab murni bertindak sebagai *Frontend* (Klien). Segala hal yang berkaitan dengan *LLM routing*, manajemen *Second Brain* (Ingest dokumen, pengoperasian Python venv), dan eksekusi *Swarm* dilempar mutlak ke *Hermes Agent* (Gateway).

## 3. Functional Requirements

### 3.1. Konfigurasi Dinamis Tersentralisasi (Centralized `.env`)
- `KNOWLEDGE_DIR` / `OBSIDIAN_VAULT_DIR`: Mengatur lokasi direktori utama *Second Brain*. Bagi *Workspace*, parameter ini HANYA digunakan untuk **menampilkan *file browser* atau graf visual** kepada pengguna. Tanggung jawab membedah isinya dipegang *Hermes Agent*.
- `HERMES_AGENT_DIR`: Mengatur jalur absolut ke lokasi *source code* peladen *Hermes Agent*. Ini memastikan antarmuka (UI) selalu tahu letak *backend*-nya beroperasi secara fisik di sistem.
- **Tanpa Konfigurasi Backup**: Lam-Cyberlab tidak mengurus *credential* GitHub atau sinkronisasi cloud sama sekali. Sistem *Auto-Backup* (Vault maupun Skills) dikendalikan 100% oleh *Cron Job* bawaan Hermes Agent.
- **Delegasi Model**: Tidak ada variabel *router/prefix* model di Workspace.
- `HERMES_API_URL` & `API_SERVER_KEY`: Menghubungkan *Workspace* ke *Gateway* (Hermes Agent).
- `HOST` & `PORT`: Mengatur *binding* jaringan.
- `HERMES_PASSWORD`: Mewajibkan kata sandi untuk mengunci Web UI dari akses publik liar.

### 3.2. Hybrid Deployment Architecture (VPS + Desktop)
- **VPS Optimized**: Kemudahan instalasi jarak jauh (*Remote Web Access*).
- **Desktop Retention**: Mempertahankan *build process* Electron agar aplikasi ini tetap bisa dikompilasi menjadi Aplikasi Desktop (`.exe` / `.app`) lokal.
- **Keamanan Default**: Jika IP terekspos (`HOST=0.0.0.0`), form login wajib aktif.

### 3.3. Penyederhanaan Instalasi UI (1-Click Setup)
- **Setup Script (`setup.sh`)**: Skrip instalasi otomatis *frontend* yang akan:
  1. Memeriksa keberadaan Node.js (v22+) dan `pnpm`.
  2. Menginstal *dependencies* untuk Web UI.
  3. Menyalin `.env.example` menjadi `.env`.
  *(Catatan: Lingkungan komputasi Python untuk Second Brain tidak lagi diinstal di Lam-Cyberlab, karena sudah dilimpahkan ke Hermes Agent).*
- **Docker Support**: `docker-compose.yml` terintegrasi untuk menjalankan UI secara harmonis dengan *container* Gateway.

### 3.4. Skill & Memory Management UI
Karena Hermes Agent sekarang memisahkan *Custom Skills* dan mem-*backup*-nya secara mandiri, Lam-Cyberlab harus menyediakan **Visual Editor** untuk *Skills* dan *Memory* (membaca/menulis ke folder `~/.hermes/skills` dan `MEMORY.md`). Namun, eksekusi sinkronisasinya ke GitHub tetap sepenuhnya diserahkan kepada penjadwalan (*cron*) di agen backend.

## 4. Target Pengguna
- **Power Users & Developer**: Pengguna VPS yang menginginkan *dashboard* visual elegan untuk berinteraksi santai dengan mesin *backend* otonom mereka.
- **AI Enthusiasts**: Pengguna yang berfokus pada pendelegasian perintah ke AI, tanpa perlu merisaukan kompleksitas mesin peladen di belakangnya.

## 5. Hubungan dengan Second Brain (LLM Wiki)
Meskipun arsitektur **"LLM Wiki"** ala Andrej Karpathy (ekstraksi AI otomatis pada *vault* Obsidian) adalah fitur unggulan ekosistem ini, **Lam-Cyberlab tidak bertugas mengeksekusinya**. 

- **Lam-Cyberlab HANYA bertugas menyediakan kemudahan antarmuka**: kolom unggah dokumen, perekam suara, manajemen profil, dan jendela *chat*. UI juga dapat menyediakan tombol **"Force Sync Now"** yang fungsinya hanya sekadar melempar sinyal API ke agen agar agen tersebut mengeksekusi skrip `sync-second-brain.sh` atau `sync-skills.sh`.
- Ketika file diunggah di *Workspace*, Lam-Cyberlab melempar muatan tersebut ke *Hermes Agent* (lewat API). Hal ini menjamin konsistensi yang seragam: entah Anda mengirim dokumen melalui *Workspace*, mengirim lewat *Bot Telegram*, atau mengunggah lewat *CLI*, hasilnya tetap diproses oleh mesin *Second Brain* (Hermes Agent) yang sama, dengan performa yang 100% sama!
