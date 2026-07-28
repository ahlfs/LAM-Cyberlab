#!/usr/bin/env bash
# Lam-Cyberlab 1-Click Setup Script untuk VPS
# Skrip ini akan menginstal dependensi Node.js, Python, dan menyiapkan environment.

set -euo pipefail

echo "=========================================================="
echo "      Lam-Cyberlab — 1-Click VPS Setup"
echo "=========================================================="

# 1. Cek Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js tidak ditemukan. Silakan instal Node.js v22+ terlebih dahulu."
  exit 1
fi
NODE_VER=$(node -v)
echo "[+] Node.js terdeteksi: $NODE_VER"

# 2. Cek pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[!] pnpm tidak ditemukan. Menginstal pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@latest --activate
fi
echo "[+] pnpm terdeteksi: $(pnpm -v)"

# 3. Instal Dependensi Node
echo "[*] Menginstal dependensi pnpm..."
pnpm install

# 4. Setup Python Virtual Environment (Second Brain)
echo "[*] Menyiapkan Python Virtual Environment untuk Second Brain..."
if ! command -v python3 >/dev/null 2>&1; then
  echo "[!] python3 tidak ditemukan. Harap instal Python 3."
  exit 1
fi

if [ ! -d ".venv-second-brain" ]; then
  # Coba pakai uv jika ada, jika tidak fallback ke venv bawaan
  if command -v uv >/dev/null 2>&1; then
    uv venv .venv-second-brain
    uv pip install -r requirements-second-brain.txt --python .venv-second-brain
  else
    python3 -m venv .venv-second-brain
    ./.venv-second-brain/bin/pip install -r requirements-second-brain.txt
  fi
  echo "[+] Python virtual environment berhasil dibuat!"
else
  echo "[+] Python virtual environment sudah ada. Melewati..."
fi

# 5. Siapkan .env
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "[*] Menyalin .env.example ke .env..."
    cp .env.example .env
    echo "[!] Harap sesuaikan variabel OBSIDIAN_VAULT_DIR dan kata sandi di dalam .env"
  fi
else
  echo "[+] File .env sudah ada. Melewati..."
fi

echo "=========================================================="
echo " Setup Selesai! "
echo " Anda dapat menjalankan server dengan perintah:"
echo "    pnpm dev"
echo " atau membangunnya untuk production dengan:"
echo "    pnpm build && pnpm start"
echo "=========================================================="
