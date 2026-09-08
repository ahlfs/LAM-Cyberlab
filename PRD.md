# Product Requirements Document (PRD): Lam-Cyberlab

## 1. Project Overview

**Lam-Cyberlab** adalah modifikasi independen (fork) dari proyek _open-source_ `hermes-workspace`. Proyek ini bertujuan untuk membangun pusat komando (Command Center) agen AI personal yang bertindak sebagai _Omnichannel UI Client_ (antarmuka visual yang bisa disandingkan dengan klien lain, seperti Bot Telegram).

Visi utama proyek ini adalah menjadikannya sistem yang **"Plug and Play"** di lingkungan _Virtual Private Server_ (VPS) _headless_ (tanpa GUI), dengan sistem konfigurasi tersentralisasi yang mendelegasikan 100% beban komputasi AI (termasuk skrip pengolahan memori) ke _Hermes Agent_.

## 2. Core Objectives

1. **Easy to Setup (Clone & Run)**: Meminimalisir langkah instalasi manual antarmuka. Cukup jalankan satu skrip atau gunakan Docker, dan Web UI langsung siap melayani.
2. **Highly Dynamic Configuration**: Menghilangkan seluruh _hardcode_ di dalam _source code_. Semua _path_ direktori dan preferensi sistem dikonfigurasi lewat satu file `.env`.
3. **Headless VPS Optimized**: Berfokus murni pada aplikasi _Web Server_, memangkas beban modul _desktop/GUI_ (seperti Electron) saat berjalan di peladen (namun tetap bisa dikompilasi ke lokal bila dibutuhkan).
4. **Clean Code Architecture**: Memastikan basis kode terstruktur, modular, dan bersih.
5. **Strict Client-Gateway Separation**: Workspace Lam-Cyberlab murni bertindak sebagai _Frontend_ (Klien). Segala hal yang berkaitan dengan _LLM routing_, manajemen _Second Brain_ (Ingest dokumen, pengoperasian Python venv), dan eksekusi _Swarm_ dilempar mutlak ke _Hermes Agent_ (Gateway).

## 3. Functional Requirements

### 3.1. Konfigurasi Dinamis Tersentralisasi (Centralized `.env`)

- `KNOWLEDGE_DIR` / `OBSIDIAN_VAULT_DIR`: Mengatur lokasi direktori utama _Second Brain_. Bagi _Workspace_, parameter ini HANYA digunakan untuk **menampilkan _file browser_ atau graf visual** kepada pengguna. Tanggung jawab membedah isinya dipegang _Hermes Agent_.
- `HERMES_AGENT_DIR`: Mengatur jalur absolut ke lokasi _source code_ peladen _Hermes Agent_. Ini memastikan antarmuka (UI) selalu tahu letak _backend_-nya beroperasi secara fisik di sistem.
- **Tanpa Konfigurasi Backup**: Lam-Cyberlab tidak mengurus _credential_ GitHub atau sinkronisasi cloud sama sekali. Sistem _Auto-Backup_ (Vault maupun Skills) dikendalikan 100% oleh _Cron Job_ bawaan Hermes Agent.
- **Delegasi Model**: Tidak ada variabel _router/prefix_ model di Workspace.
- `HERMES_API_URL` & `API_SERVER_KEY`: Menghubungkan _Workspace_ ke _Gateway_ (Hermes Agent).
- `HOST` & `PORT`: Mengatur _binding_ jaringan.
- `HERMES_PASSWORD`: Mewajibkan kata sandi untuk mengunci Web UI dari akses publik liar.

### 3.2. Hybrid Deployment Architecture (VPS + Desktop)

- **VPS Optimized**: Kemudahan instalasi jarak jauh (_Remote Web Access_).
- **Desktop Retention**: Mempertahankan _build process_ Electron agar aplikasi ini tetap bisa dikompilasi menjadi Aplikasi Desktop (`.exe` / `.app`) lokal.
- **Keamanan Default**: Jika IP terekspos (`HOST=0.0.0.0`), form login wajib aktif.

### 3.3. Penyederhanaan Instalasi UI (1-Click Setup)

- **Setup Script (`setup.sh`)**: Skrip instalasi otomatis _frontend_ yang akan:
  1. Memeriksa keberadaan Node.js (v22+) dan `pnpm`.
  2. Menginstal _dependencies_ untuk Web UI.
  3. Menyalin `.env.example` menjadi `.env`.
     _(Catatan: Lingkungan komputasi Python untuk Second Brain tidak lagi diinstal di Lam-Cyberlab, karena sudah dilimpahkan ke Hermes Agent)._
- **Docker Support**: `docker-compose.yml` terintegrasi untuk menjalankan UI secara harmonis dengan _container_ Gateway.

### 3.4. Skill & Memory Management UI

Karena Hermes Agent sekarang memisahkan _Custom Skills_ dan mem-_backup_-nya secara mandiri, Lam-Cyberlab harus menyediakan **Visual Editor** untuk _Skills_ dan _Memory_ (membaca/menulis ke folder `~/.hermes/skills` dan `MEMORY.md`). Namun, eksekusi sinkronisasinya ke GitHub tetap sepenuhnya diserahkan kepada penjadwalan (_cron_) di agen backend.

## 4. Target Pengguna

- **Power Users & Developer**: Pengguna VPS yang menginginkan _dashboard_ visual elegan untuk berinteraksi santai dengan mesin _backend_ otonom mereka.
- **AI Enthusiasts**: Pengguna yang berfokus pada pendelegasian perintah ke AI, tanpa perlu merisaukan kompleksitas mesin peladen di belakangnya.

## 5. Hubungan dengan Second Brain (LLM Wiki)

Meskipun arsitektur **"LLM Wiki"** ala Andrej Karpathy (ekstraksi AI otomatis pada _vault_ Obsidian) adalah fitur unggulan ekosistem ini, **Lam-Cyberlab tidak bertugas mengeksekusinya**.

- **Lam-Cyberlab HANYA bertugas menyediakan kemudahan antarmuka**: kolom unggah dokumen, perekam suara, manajemen profil, dan jendela _chat_. UI juga dapat menyediakan tombol **"Force Sync Now"** yang fungsinya hanya sekadar melempar sinyal API ke agen agar agen tersebut mengeksekusi skrip `sync-second-brain.sh` atau `sync-skills.sh`.
- Ketika file diunggah di _Workspace_, Lam-Cyberlab melempar muatan tersebut ke _Hermes Agent_ (lewat API). Hal ini menjamin konsistensi yang seragam: entah Anda mengirim dokumen melalui _Workspace_, mengirim lewat _Bot Telegram_, atau mengunggah lewat _CLI_, hasilnya tetap diproses oleh mesin _Second Brain_ (Hermes Agent) yang sama, dengan performa yang 100% sama!
