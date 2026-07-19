# PRD — Fitur Tambahan Lam Cyberlab (ahlfs)

- **Owner:** ahlfs (ryuezzx@gmail.com)
- **Dibuat:** 2026-07-18
- **Status:** Fitur 1–3 selesai (2026-07-18/19); Fitur 4 didefinisikan 2026-07-19, belum dikerjakan.
- **Konteks:** Empat fitur yang ingin ditambahkan ke instance Lam Cyberlab. Mengikuti prinsip zero-fork repo ini: semua perubahan hidup di workspace (UI/control-plane), tidak menyentuh `hermes-agent`.

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

## Fitur 3 — Manajemen Link (port dari Linku) — ✅ SELESAI (2026-07-19, MVP)

> Implementasi: data layer `src/server/linku-db.ts` (SQLite via better-sqlite3, skema folders/links/tags/link_tags, 19 unit test) + `src/server/linku-scrape.ts` (title+favicon scraper, 10 unit test) di `~/.hermes/workspace/linku/linku.db`. 11 route API di `src/routes/api/links*.ts` (namespace `item/`, `folders/`, `tags`, `go/`, `scrape`, `trash-empty` — sengaja dipisah dari `$id` dinamis untuk hindari collision routing). Screen `src/screens/links/` (folder grid dengan tab warna browser-style, link grid, dialog add/edit dengan tag autocomplete portaled). Terpasang di sidebar grup Knowledge setelah Memory (desktop, mobile tab bar, hamburger, workspace-shell) sesuai konfirmasi user. Packaging Electron untuk better-sqlite3 (dependency native pertama di repo) diperbaiki: esbuild `--external:better-sqlite3`, script `electron:rebuild-native`/`electron:restore-native`, `files` allowlist mencakup rantai runtime better-sqlite3→bindings→file-uri-to-path.
>
> **Temuan a11y saat verifikasi (ditandai sebagai task terpisah, bukan diperbaiki di sini):** pola "teks accent di atas background accent-subtle" untuk item nav aktif (dipakai sidebar utama & rail Links) gagal WCAG AA di theme terang (~1.4-1.7:1 terukur, butuh 4.5:1) — pre-existing di seluruh app, bukan spesifik Linku.
>
> **Revisi 2026-07-19 (setelah dipakai user beberapa waktu):** (1) Kartu link sekarang `<a href="/api/links/go/:id" target="_blank">` langsung — klik kartu = buka link (mencatat "Dikunjungi"), bukan buka dialog edit. (2) Satu-satunya tombol terlihat di kartu adalah menu titik tiga (Edit/Favorite/Archive/Move to Trash, atau Restore/Delete permanently di Trash) — ikon Open & Favorite terpisah dihapus dari kartu. (3) **Fitur tags dihapus total** (tabel `tags`/`link_tags`, `TagInput`, route `/api/links/tags`, param `tags` di create/update — semua dibuang, bukan disembunyikan). (4) **Folder jadi opsional** — `createLink`/`updateLink` menerima `folderId?: number | null`, dialog link default ke "No folder", tombol "New link" tidak lagi butuh folder ada dulu. Diverifikasi langsung terhadap data nyata milik user (folder "Kuliah") tanpa merusaknya.

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
- **Storage — KEPUTUSAN (2026-07-19):** SQLite via `better-sqlite3` (dependency baru; repo belum punya database apa pun). Lokasi ikut konvensi `getStateDir()` (`src/server/workspace-state-dir.ts`, dipakai `knowledge-config.json` dkk): `~/.hermes/workspace/linku/linku.db` + `~/.hermes/workspace/linku/favicons/` untuk cache favicon. Alasan: skema Linku asli relasional (folder 1:N link, link M:N tag) — SQL jauh lebih pas daripada reimplementasi join di JS; SQLite juga idiomatik untuk data lokal di app Electron (target build repo ini). Bukan JSON, bukan `.runtime/` (itu cache cwd-relative), bukan dalam repo git (data pribadi tidak boleh ikut commit/clone).
- **Risiko Electron packaging — DIPUTUSKAN untuk diperbaiki (2026-07-19):** `better-sqlite3` adalah dependency native pertama di repo ini (dicek: sebelumnya nol). Jalur `pnpm dev` (clone-and-run standar, sama seperti Hermes Workspace asli) sepenuhnya aman — `pnpm install` otomatis mengunduh prebuild yang cocok dengan Node sistem. Jalur **installer desktop** (`pnpm electron:build*`) berisiko rusak karena: (1) server produksi Electron dijalankan lewat `process.execPath` + `ELECTRON_RUN_AS_NODE` (Node bawaan Electron, ABI beda dari Node sistem — lihat `electron/main.cjs` fungsi `startLocalServer`), (2) `electron-builder.config.cjs` set `nodeGypRebuild: false` dan `files` tidak menyertakan `node_modules` (server dibundel esbuild, tidak bisa membundel binary native). **Scope tambahan yang harus dikerjakan sebelum Linku dianggap selesai untuk jalur desktop:** tambahkan `@electron/rebuild` sebagai dev dependency + langkah rebuild native terhadap ABI Electron di script `electron:build*`, dan sertakan binary hasil rebuild `better-sqlite3` (`node_modules/better-sqlite3/build/Release/*.node` + `.js` wrapper minimal) ke daftar `files` di `electron-builder.config.cjs`, plus tandai `better-sqlite3` sebagai `external` di command esbuild `electron:bundle-server` supaya tidak salah coba dibundel.
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

**Catatan pasca-implementasi (revisi 2026-07-19):** MVP di atas sudah diubah — lihat detail di changelog fitur ini pada memori/riwayat sesi: kartu link klik-langsung-buka, favorite pindah ke dropdown titik tiga, **fitur tags dihapus total**, folder jadi opsional (link tidak wajib punya folder).

---

## Fitur 4 — Akses Publik (IPv4 + Domain Custom) — 🟡 LAPIS 1 SELESAI (2026-07-19), lapis 2-3 belum

> **Implementasi lapis 1 (2026-07-19):** halaman khusus **`/remote-access`** (sidebar, setelah System — dipilih dedicated page, bukan section Settings, sesuai preferensi owner). Backend: `src/server/remote-access-config.ts` (baca/tulis `.env` mirip `ensure_env_key` bash, `getRemoteAccessStatus()`, `setWorkspacePassword()` — langsung live tanpa restart karena auth-middleware baca `process.env` setiap request, `setExposeEnabled()` — butuh restart karena HOST di-bind sekali saat startup, `detectPublicIp()` — user-triggered via api.ipify.org, bukan otomatis; 13 unit test terisolasi pakai `process.chdir()` ke tmpdir supaya tidak pernah menyentuh `.env` asli). 4 route API (`src/routes/api/remote-access.{status,password,expose,public-ip}.ts`), semua digerbang `requireLocalOrAuth` + rate-limited.
>
> **Temuan & perbaikan penting selama implementasi:** `pnpm start` (`node server-entry.js`, jalur produksi/systemd/launchd) ternyata **tidak pernah membaca `.env` sama sekali** — hanya `pnpm dev` (lewat Vite) yang otomatis memuatnya. Ditambahkan loader `.env` minimal (parser inline, tanpa dependency baru) di awal `server-entry.js`, tidak menimpa env var asli (systemd `Environment=` tetap menang). Tanpa perbaikan ini, toggle "Expose to internet" di UI tidak akan pernah berefek pada deployment `pnpm start`.
>
> **Rate limiting endpoint login — sudah ada sebelumnya, diverifikasi bukan ditambah baru:** `src/routes/api/auth.ts` sudah pakai `src/server/rate-limit.ts` (5 percobaan/menit per IP + delay 1 detik saat gagal) — acceptance criteria Fitur 4 soal ini otomatis terpenuhi tanpa kerja tambahan.
>
> **UX toggle:** sesuai preferensi owner, toggle "Expose to internet" **disabled + hint inline** ("Set a password above first") selama password belum diset — bukan modal. Menyalakan toggle menulis `HOST=0.0.0.0` ke `.env` dan menampilkan banner "restart required" (tidak bisa live karena Node http.Server sudah bind sekali saat start) — status page mendeteksi drift antara `.env` di disk vs `process.env` yang benar-benar berjalan.
>
> **Verifikasi:** 13/13 unit test lulus (isolasi total dari `.env` asli lewat `process.chdir()` ke tmpdir), `tsc --noEmit` bersih (baseline error tidak berubah), full `vitest run` tidak menambah kegagalan baru (74 kegagalan pra-eksisting semuanya di worktree lain/`mcp-hub`/`mcp-presets`/e2e specs, tidak terkait). Diverifikasi live di browser: halaman render benar, password-gate pada toggle bekerja, navigasi sidebar berfungsi. **Sengaja tidak** menekan tombol "Set password"/toggle secara nyata terhadap `.env` live milik owner selama verifikasi — berisiko mengunci sesi aktif owner sendiri; owner yang mencoba fitur ini kapan pun siap.
>
> **Belum dikerjakan:** Lapis 2 (checklist firewall VPS — sudah didokumentasikan inline di panel "Reachability" halaman ini sebagai 4 langkah, jadi sebagian sudah tercakup) dan Lapis 3 (Caddy + domain custom + `scripts/setup-remote-access.sh`) — lihat scope asli di bawah, statusnya masih 🔲.

### Ringkasan
Memungkinkan instance Lam Cyberlab (biasanya jalan di VPS headless, tanpa display — hanya terminal) diakses lewat internet publik: via IP publik VPS langsung, dan/atau lewat domain custom dengan HTTPS otomatis. **Wajib** mewajibkan password saat mode ini dinyalakan, supaya kalau IP/domain bocor, instance tidak terbuka begitu saja.

### Temuan penting dari audit kode (sebelum desain fitur ini)
Sebagian fondasi **sudah ada**, jadi fitur ini bukan membangun dari nol:
- `server-entry.js` sudah punya **fail-closed guard**: menolak start kalau `HOST` bukan `127.0.0.1` tanpa `HERMES_PASSWORD`/`CLAUDE_PASSWORD` diset (bisa di-bypass paksa dengan `HERMES_ALLOW_INSECURE_REMOTE=1`, tidak direkomendasikan).
- `isPasswordProtectionEnabled()` di `src/server/auth-middleware.ts` sudah jadi gate auth semua route.
- Env var `HOST` (default `127.0.0.1`) sudah mengontrol bind address; `COOKIE_SECURE` dan `TRUST_PROXY` sudah ada dan didesain persis untuk skenario di belakang reverse proxy.
- **Yang belum ada:** pengalaman terpandu di UI (semua ini baru terlihat lewat env var + baca dokumentasi), reachability check, dan seluruh bagian domain custom + HTTPS otomatis (belum ada Caddy/nginx/tunnel apa pun di repo).

### Prinsip desain: 100% opt-in, nol dampak ke `pnpm dev` default
Tidak ada satu pun default yang berubah untuk orang yang cuma clone-and-run lokal. Fitur ini murni lapisan tambahan yang baru aktif kalau user eksplisit menyalakannya.

### Scope — tiga lapis

**Lapis 1 — UI Settings → "Remote Access" (baru, ringan)**
- Toggle "Expose to internet". Saat dinyalakan, **memaksa** alur set password inline saat itu juga — bukan menunggu app gagal start dengan error yang baru terlihat di log server. Ini murni membungkus guard backend yang sudah ada (`isPasswordProtectionEnabled` + fail-closed guard) jadi UX yang jelas, hampir tanpa logika keamanan baru di backend.
- Menampilkan status reachability: IP publik terdeteksi, port yang dipakai, dan hasil self-check apakah port itu kelihatannya terbuka dari luar.

**Lapis 2 — Reachability VPS (skenario utama yang diminta)**
- VPS pada dasarnya sudah punya IP publik — jadi `HOST=0.0.0.0` + buka port di firewall/security-group VPS itu sendiri **sudah cukup**, tanpa perlu tunneling apa pun untuk kasus ini.
- Checklist terpandu di Settings (bahasa awam: "buka port 3000 di firewall VPS-mu") karena app tidak bisa otomatis membuka firewall cloud provider dari dalam.

**Lapis 3 — Domain custom + HTTPS otomatis (bagian paling baru)**
- **Rekomendasi: Caddy sebagai reverse proxy opsional**, bukan Node yang terminate TLS sendiri. Caddy otomatis urus sertifikat Let's Encrypt + renewal, nyaris tanpa config — dan selaras dengan `TRUST_PROXY`/`COOKIE_SECURE` yang sudah ada di repo, didesain persis untuk skenario ini.
- Script helper baru `scripts/setup-remote-access.sh`, mengikuti pola `install-dashboard-service.sh` yang sudah ada: install Caddy kalau belum ada, generate Caddyfile dari domain yang diisi user di Settings, restart service.
- App tetap listen di `127.0.0.1:3000` secara internal; hanya Caddy yang bind ke `0.0.0.0:443` — mengecilkan permukaan serangan (app sendiri tidak pernah langsung terekspos).

### Keputusan keamanan tambahan (bukan opsional)
- **Rate limiting pada endpoint login** — wajib, bukan opsional. Password saja adalah satu lapis pertahanan; begitu IP/domain bocor, penyerang punya akses brute-force langsung ke instance yang punya akses terminal & file. Repo sudah punya "rate limiting on endpoints" secara umum (disebut di README) — perlu dipastikan berlaku ketat khusus di endpoint auth.
- **Dicatat sebagai alternatif** (bukan pengganti jalur VPS di atas): Cloudflare Tunnel untuk user yang bukan di VPS (di belakang NAT rumah) — tanpa perlu buka port sama sekali, dapat proteksi WAF gratis. Di luar scope MVP, dicatat untuk fase 2.

### Non-goal (MVP)
- Bukan multi-user dengan role berbeda — password tunggal (sama seperti `HERMES_PASSWORD` sekarang).
- Bukan tunneling/NAT-traversal otomatis untuk skenario non-VPS (dicatat sebagai fase 2 opsional, lihat di atas).
- Bukan manajemen DNS otomatis — user tetap yang mengarahkan domain ke IP VPS di registrar masing-masing.

### Acceptance criteria (MVP)
1. Toggle "Expose to internet" di Settings memaksa set password sebelum bisa aktif — tidak bisa dilewati dari UI.
2. Dengan `HOST=0.0.0.0` + password diset, instance bisa diakses dari IP publik VPS.
3. User bisa isi domain custom di Settings → script generate Caddyfile → domain aktif dengan HTTPS otomatis (sertifikat valid, auto-renew).
4. Endpoint login punya rate limiting yang terverifikasi (bukan cuma didokumentasikan).
5. Default `pnpm dev` / clone-and-run lokal sama sekali tidak berubah perilakunya.

### Estimasi ukuran: **M–L** (lapis 1–2 relatif kecil karena membungkus mekanisme yang sudah ada; lapis 3 — otomasi Caddy + script — yang paling banyak kerja baru)

---

## Urutan pengerjaan yang disarankan
1. **Dracula Soft** — ✅ selesai.
2. **Monitor perangkat** — ✅ selesai.
3. **Linku** — ✅ selesai (MVP, sudah direvisi).
4. **Akses Publik** — berikutnya; disarankan lapis 1–2 dulu (UI + VPS checklist, kerja kecil karena membungkus mekanisme existing), baru lapis 3 (Caddy automation) setelah lapis 1–2 terbukti jalan.

## Pertanyaan terbuka
- Fitur 3: perlukah import data dari instance Linku PHP lama (database.sql)?
- Fitur 4: password tunggal untuk semua remote access sudah cukup, atau perlu dipisah dari `HERMES_PASSWORD` biasa (misal beda password untuk akses publik vs LAN lokal)?
- Fitur 4: Caddy dijadikan dependency wajib saat lapis 3 dipakai, atau tetap opsional dengan Nginx sebagai alternatif terdokumentasi (tidak diotomasi)?
