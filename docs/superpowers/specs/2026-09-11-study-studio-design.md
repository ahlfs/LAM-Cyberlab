# Design Spec: Study Studio (Interactive Knowledge Learning Page)

**Date:** 2026-09-11  
**Target Repository:** `lam-cyberlab`  
**Status:** Approved for Implementation Planning  

---

## 1. Overview & Objective
Menyediakan halaman interaktif baru bernama **Study Studio** (`/study`) di bawah kategori **Knowledge & Brain** pada LAM-Cyberlab. Halaman ini memungkinkan pengguna memasukkan berbagai sumber daya pengetahuan (tautan web, berkas dokumen PDF/MD/TXT/DOCX, dan rekaman audio) agar Hermes Agent dapat mempelajarinya secara interaktif melalui streaming dialog, mengekstraksi intisari konsep, dan menyimpannya secara terstruktur ke dalam Obsidian Second Brain vault (`03-Notes/Extracted-Docs/` dan `04-Wiki/`).

---

## 2. Architecture & Routing

### 2.1 Navigation & Layout
- **URL Route:** `/study`
- **Route Definition:** `src/routes/study.tsx` via TanStack Router.
- **Sidebar Integration (`src/screens/chat/components/chat-sidebar.tsx`):**
  - Section: `Knowledge & Brain`
  - Label: `Study Studio`
  - Icon: `BookOpen01Icon` (Hugeicons)
- **Topbar Breadcrumb (`src/components/layout/workspace-topbar.tsx`):**
  - Mapping: `/study` -> `Study Studio`

### 2.2 Component Hierarchy (`src/screens/study/`)
- `study-screen.tsx`: Dual-pane responsive workspace container.
- `components/resource-stage.tsx`: Input formulir (URL parser, multi-format file dropzone, audio uploader) dan list status resource aktif.
- `components/study-agent-panel.tsx`: Live stream terminal interaktif dengan Hermes Agent, intisari poin konsep, dan action button sync ke Second Brain.
- `components/resource-preview-dialog.tsx`: Modal pratinjau teks/markdown bersih yang diekstraksi dari file/URL.

### 2.3 State Management (`src/stores/study-store.ts`)
- Staged resources list (items: `id`, `name`, `type`, `size`, `rawContent`, `status: 'idle' | 'parsing' | 'ready' | 'analyzing' | 'ingested'`).
- Active focused resource ID.
- Live analysis messages & draft concept notes.
- Second Brain sync progress state.

---

## 3. Backend & API Services (`src/routes/api/study/` & `src/server/`)

### 3.1 API Endpoints
1. `POST /api/study/extract`:
   - Menerima payload URL (`{ url: string }`) atau file form data (`multipart/form-data`).
   - Melakukan parsing:
     - URL: Web scraper dengan pembersihan HTML ke Markdown.
     - PDF/DOCX/TXT/MD: Ekstraksi teks berbasis parser server.
     - Audio: Delegasi ke pipeline transkripsi audio internal.
   - Mengembalikan metadata dokumen dan konten teks hasil ekstraksi.

2. `POST /api/study/analyze`:
   - Endpoint proxy SSE (Server-Sent Events) ke Hermes Gateway API (default port 8642).
   - Memasukkan prompt sistem khusus "Interactive Knowledge Extractor" untuk menghasilkan ringkasan terstruktur, definisi entitas, dan rekomendasi tautan wiki `[[Concept]]`.

3. `POST /api/study/commit`:
   - Menyimpan berkas markdown terstruktur ke `$OBSIDIAN_VAULT_DIR/03-Notes/Extracted-Docs/<slug>.md`.
   - Menjalankan skrip background `bash ~/.hermes/hermes-agent/scripts/second-brain/sync-second-brain.sh` untuk memicu Pass 2 (Doc Parsing), Pass 4 (Wiki Ingest ke `04-Wiki/`), dan Pass 5 (Git Backup).

---

## 4. UI & Theme Compliance
- Mengikuti palet warna **Aura / Dracula Modern Dark** native LAM-Cyberlab (`#282a36` background, `#343746` card/sidebar, aksen violet/pink/green).
- Menggunakan komponen UI konsisten dari `@/components/ui/` (Button, Input, Tabs, Dialog, Tooltip, Progress).
- Tampilan responsif: split pane berdampingan pada layar desktop dan tab toggle pada mobile.

---

## 5. Error Handling & Edge Cases
- **URL Scraping Failure:** Fallback ke manual text paste input jika URL diblokir oleh anti-bot atau paywall.
- **Vault Directory Fallback:** Defaulting ke `~/obsidian/memo` jika environment variable `OBSIDIAN_VAULT_DIR` tidak ditemukan.
- **Port Safety:** Memastikan interaksi agent dan proxy internal tidak mengganggu reserved port (3000, 20128, 8900).
