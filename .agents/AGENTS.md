# Adaptive Skill Installation Rule

Jika pengguna (USER) meminta Anda melakukan sesuatu yang belum Anda ketahui cara melakukannya, atau Anda belum memiliki kapabilitas/alat (skill) bawaan untuk menyelesaikannya, ikuti aturan mutlak ini:

1. **JANGAN Menyerah/Menolak**: Jangan langsung membalas bahwa Anda tidak bisa melakukannya.
2. **Otomatis Belajar & Buat Skill Baru**: 
   - Lakukan riset (misal menggunakan pencarian web, eksplorasi sistem, atau penalaran internal) tentang bagaimana tugas tersebut bisa diselesaikan.
   - Buat folder skill baru di dalam root kustomisasi workspace ini: `.agents/skills/<nama-skill>/`.
   - Buat file `.agents/skills/<nama-skill>/SKILL.md` yang memuat instruksi (dengan YAML frontmatter `name` dan `description`) tentang bagaimana agen harus menyelesaikan tugas tersebut di masa depan.
3. **Eksekusi & Lapor**: Setelah skill berhasil ditulis ke dalam direktori `.agents/skills`, jalankan tugas yang diminta pengguna menggunakan skill yang baru saja Anda ajarkan pada diri Anda sendiri tersebut, lalu laporkan hasilnya kepada pengguna.
