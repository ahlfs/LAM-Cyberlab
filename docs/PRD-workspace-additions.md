# PRD — Fitur Tambahan Lam Cyberlab (ahlfs)

- **Owner:** ahlfs (ryuezzx@gmail.com)
- **Dibuat:** 2026-07-18
- **Status:** Fitur 1 selesai (2026-07-18); Fitur 2 & 3 belum dikerjakan
- **Konteks:** Tiga fitur yang ingin ditambahkan ke instance Lam Cyberlab lokal. Mengikuti prinsip zero-fork repo ini: semua perubahan hidup di workspace (UI/control-plane), tidak menyentuh `hermes-agent`.

---

## Fitur 1 — Theme "Dracula Soft" (gaya VSCode) — ✅ SELESAI (2026-07-18)

> Implementasi: `src/dracula-theme.css` (di-import dari `styles.css`), registrasi di `src/lib/theme.ts`, plus daftar theme-id di `__root.tsx`, `settings-dialog.tsx`, `routes/settings/index.tsx`, `chat-sidebar.tsx`, `dashboard-screen.tsx`, `provider-logo.tsx`. Palet dark dari dracula-soft.json resmi (via shiki tm-themes); light memakai palet Alucard. Terverifikasi live di Settings → Appearance, toggle dark↔light OK.

### Ringkasan
Menambahkan pasangan theme baru bergaya **Dracula Soft** (varian Dracula VSCode dengan warna yang lebih redup/desaturated) ke pilihan theme yang sudah ada (Nous, Matrix, Hermes, Bronze, Slate, SciFi).

### Latar belakang teknis (hasil survei kode)
- Registry theme: `src/lib/theme.ts` — `ThemeId` union + array `THEMES` (id, label, description, icon). Setiap theme gelap **wajib** punya pasangan light di `LIGHT_THEME_MAP`.
- Variabel warna CSS per theme: `src/styles.css`.

### Scope
- Theme baru `dracula` (+ `dracula-light` sebagai pasangan wajib; varian light bisa mengacu ke "Alucard", light theme resmi Dracula).
- Palet mengikuti spec resmi varian **Soft** dari repo `dracula/visual-studio-code` (warna accent desaturated: ungu, pink, cyan, green, orange, red, yellow di atas background gelap #22212C-ish) — ambil nilai persis dari sumber resmi saat implementasi, jangan dikira-kira.
- Muncul di picker theme Settings seperti theme lain.

### Non-goal
- Tidak mengubah theme lain; tidak membuat sistem theme kustom/user-defined.

### Acceptance criteria
1. `dracula` & `dracula-light` muncul di picker dan bisa dipilih + tersimpan (localStorage key `claude-theme`).
2. Semua permukaan utama (chat, sidebar, dashboard, terminal, Monaco) terbaca jelas — kontras memadai, tidak ada teks "hilang".
3. Toggle dark↔light bekerja lewat `LIGHT_THEME_MAP`.

### Estimasi ukuran: **S** (1 sesi kerja)

---

## Fitur 2 — Monitor Perangkat ala CasaOS — ✅ SELESAI (2026-07-18, MVP)

> Implementasi (revisi per permintaan owner 2026-07-18): **halaman khusus `/system`** dengan entri sidebar di bawah Swarm (juga di tab bar & hamburger mobile), BUKAN widget dashboard (widget awal sempat dibuat lalu dicabut). Kolektor `src/server/system-stats.ts` (parser /proc murni + delta CPU/net per-interface, breakdown memori used/cached/free, jumlah proses; unit test 13/13), route `src/routes/api/system-stats.ts`, screen `src/screens/system/system-screen.tsx` (panel CPU per-core + riwayat 5 menit, Memory stacked-bar, Storage per-volume, Network per-interface + chart RX/TX dengan crosshair hover). Poll 2 detik, jeda otomatis saat tab tersembunyi.

### Ringkasan
Panel pemantauan resource mesin host (seperti dashboard CasaOS): CPU, RAM, disk, jaringan, uptime — live di dalam Workspace.

### Latar belakang teknis
- API route pakai file-based routing: `src/routes/api/<nama>.ts` (contoh pola: `src/routes/api/connection-status.ts`).
- Screen UI di `src/screens/` (sudah ada `dashboard` — widget bisa nempel di sana dan/atau screen khusus).
- Belum ada kode metric sistem sama sekali di `src/server` (sudah dicek).

### Scope (MVP)
- **Backend:** route `GET /api/system-stats` yang membaca metric host: CPU % (total + per-core), load average, RAM used/total, swap, disk used/total per mount, network RX/TX rate, uptime, hostname, suhu (kalau tersedia). Sumber data: `/proc` & `os` bawaan Node, atau paket `systeminformation` (keputusan saat implementasi; `systeminformation` lebih lengkap & cross-platform).
- **Refresh:** polling interval 2–5 detik dari client (SSE opsional, menyusul).
- **UI:** strip/kartu widget di screen Dashboard + halaman detail (grafik riwayat singkat in-memory, misal 5 menit terakhir).
- Ikuti pola auth yang ada (`src/server/auth-middleware.ts`) — endpoint tidak boleh bocor tanpa auth saat remote bind.

### Non-goal (pembeda dari CasaOS penuh)
- Bukan app store / manajemen container Docker, bukan manajemen file — hanya monitoring.

### Acceptance criteria
1. `/api/system-stats` mengembalikan JSON metric valid di Linux (target utama: mesin ini, Debian).
2. Widget dashboard menampilkan CPU/RAM/disk/network yang berubah live.
3. Tidak membebani host (sampling ringan, tidak spawn proses per-request bila bisa dihindari).

### Estimasi ukuran: **M** (1–2 sesi kerja)

---

## Fitur 3 — Manajemen Link (port dari Linku)

### Ringkasan
Membangun ulang **Linku** — aplikasi manajemen bookmark buatan ahlfs (PHP native + Medoo + MySQL, repo: https://github.com/ahlfs/Linku) — sebagai fitur native Lam Cyberlab (React + TS + API route lokal).

### Fitur Linku asli yang dijadikan referensi (dari README repo)
- **Physical Folder Design:** folder visual seperti map fisik dengan tab warna dinamis, seluruh area folder klik-able.
- **Metadata scraping:** judul web + favicon otomatis saat link dimasukkan (tanpa screenshot preview).
- **Label/Tags** dengan autocomplete.
- **Recent, Favorites, Archive & Trash** (soft delete) dengan layout Grid vs List.
- **Dynamic search:** folder/link/tag instan.
- **Stats tracking:** "Dikunjungi" (klik Buka Website, via API perantara) vs "Dibuka" (halaman detail diakses).
- **Zona waktu WIB** default.

### Adaptasi ke Workspace
- **Tanpa auth/register sendiri** — Workspace sudah punya auth middleware; Linku versi ini single-user.
- **Storage:** bukan MySQL. Pilihan: SQLite lokal (ikuti pola penyimpanan lokal repo) atau flat-file JSON. Keputusan di fase desain; kebutuhan: folder, link, tag, relasi link-tag, counter stats, flag favorite/archive/trash + timestamp.
- **Scraper:** server-side fetch (route API) untuk title + favicon — hormati timeout & jangan follow redirect berlebihan.
- **UI:** screen baru `src/screens/links` + entri navigasi sidebar; pertahankan identitas visual "folder fisik dengan tab warna" dari Linku, tapi pakai token warna theme Workspace (harus tetap bagus di Dracula Soft, Nous, dll.).
- **Route API:** `src/routes/api/links/…` (CRUD link/folder/tag, scrape, redirect-visit untuk stats "Dikunjungi").

### Non-goal
- Multi-user/workspace terpisah, import dari browser (bisa jadi fase 2), screenshot preview.

### Acceptance criteria (MVP)
1. CRUD folder (dengan warna), link, dan tag; link bisa dipindah folder.
2. Tambah link → judul + favicon terisi otomatis.
3. Favorites, Recent, Archive, Trash (soft delete + restore) berfungsi.
4. Search instan lintas folder/link/tag.
5. Counter "Dikunjungi" dan "Dibuka" tercatat seperti perilaku Linku asli.

### Estimasi ukuran: **L** (fitur terbesar — kerjakan bertahap: storage+API → UI folder/link → tags+search → stats+trash)

---

## Urutan pengerjaan yang disarankan
1. **Dracula Soft** (kecil, hasil langsung terlihat, sekaligus memvalidasi alur theme).
2. **Monitor perangkat** (backend+widget, independen dari fitur lain).
3. **Linku** (terbesar; UI-nya wajib dites terhadap theme baru).

## Pertanyaan terbuka
- Fitur 2: cukup widget di Dashboard yang ada, atau screen khusus "System" di sidebar? (MVP: widget dulu.)
- Fitur 3: SQLite vs JSON flat-file untuk storage? (Cenderung SQLite bila dependency-nya sudah ada di lockfile.)
- Fitur 3: perlukah import data dari instance Linku PHP lama (database.sql)?
