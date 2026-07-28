---
name: graphify
description: Turn any folder of files into a navigable knowledge graph
---

# Workflow: graphify

Follow the graphify skill installed at `~/.gemini/config/skills/graphify/SKILL.md` to run the full pipeline.

**Smart Path Detection (Khusus Lam-Cyberlab):**
Jika pengguna tidak memberikan argumen path, **JANGAN** langsung menggunakan `.` (current directory). Lakukan langkah berikut:
1. Baca file `.env` di proyek ini untuk mencari nilai variabel `OBSIDIAN_VAULT_DIR` atau `KNOWLEDGE_DIR`.
2. Jika variabel tersebut ditemukan, TANYAKAN secara interaktif kepada pengguna:
   *"Apakah Anda ingin melakukan proses Graphify pada Workspace kode ini (`.`) atau pada Second Brain Obsidian Anda (`<path-dari-env>`)?"*
3. Jika pengguna tidak menentukan atau variabel tidak ada di `.env`, barulah gunakan `.` (current directory).
