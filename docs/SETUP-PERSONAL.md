# Setup Instance Pribadi (ahlfs)

Panduan menjalankan Workspace ini di device baru sampai kondisinya sama
seperti instance utama (`cyber-lab`). Repo ini adalah fork personal yang
sudah dilepas dari upstream `outsourc-e/hermes-workspace`.

## 1. Prasyarat per device

- Node.js ≥ 22 + pnpm
- `hermes-agent` terinstal via installer resmi Nous (menyediakan CLI `hermes`)

## 2. Clone & install

```bash
git clone git@github.com:ahlfs/<NAMA-REPO>.git hermes-workspace
cd hermes-workspace
pnpm install
```

## 3. Nyalakan gateway + API server (sisi hermes-agent)

API server gateway default-nya MATI dan menolak start tanpa key.
Di `~/.hermes/.env` device tersebut:

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=<key acak, mis. hasil `openssl rand -hex 32`>
```

Jalankan gateway (atau pasang sebagai systemd user service seperti di
instance utama: unit `hermes-gateway.service`):

```bash
hermes gateway run          # port 8642
```

## 4. Konfigurasi Workspace

Salin `.env.example` → `.env`, lalu set minimal:

```bash
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_TOKEN=<SAMA persis dengan API_SERVER_KEY di ~/.hermes/.env>
```

`.env` sengaja di-gitignore — token tidak pernah ikut repo; isi manual
per device.

## 5. Jalankan

```bash
pnpm dev                    # workspace di :3000
# opsional: hermes dashboard  → :9119, membuka panel Skills/Config/Jobs penuh
```

Buka `http://localhost:3000`, selesaikan probe onboarding (Retry →
Continue). Verifikasi cepat: `curl http://127.0.0.1:3000/api/connection-status`
harus mengembalikan `"status":"connected"`.

## 6. Preferensi per browser

Pilihan theme (mis. Dracula Soft) dan layout dashboard disimpan di
localStorage — set sekali per browser lewat Settings → Appearance.

## Catatan fork

- Riwayat git dimulai ulang saat dilepas dari upstream (2026-07-18);
  update dari repo resmi tidak lagi ditarik via git.
- Konfigurasi auto-update Electron & workflow release masih menunjuk
  repo resmi — abaikan (atau sesuaikan) bila ingin build desktop sendiri.
- Konteks proyek untuk agent AI: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`,
  roadmap di `docs/PRD-workspace-additions.md`.
