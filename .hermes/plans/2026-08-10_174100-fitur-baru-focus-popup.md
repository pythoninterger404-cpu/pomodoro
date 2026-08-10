# Focus Popup — Rencana Fitur Baru

> **Untuk Hermes:** Gunakan skill `feature-build-discipline` dan `subagent-driven-development` untuk implementasi per fitur.

**Goal:** Menambahkan 6 fitur baru ke Focus Popup untuk meningkatkan produktivitas, motivasi, dan fleksibilitas pengguna.

**Architecture:** Semua fitur mempertahankan struktur existing (React + TypeScript + Tailwind + Supabase). Fitur baru ditambahkan secara aditif tanpa merusak fitur yang sudah ada. Data pengguna tetap disimpan di localStorage (offline-first) + Supabase (cloud sync).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase (auth + db), recharts, lucide-react, Web Notification API, File API.

---

## Fitur 1: Notifikasi Browser

**Prioritas:** Tinggi | **Estimasi:** 30 menit

Saat sesi fokus selesai dan tab tidak aktif, kirim browser notification. User bisa enable/disable di Settings.

**Yang perlu diubah:**
- `src/lib/notifications.ts` — file baru: minta izin notifikasi, fungsi `sendNotification(title, body)`
- `src/components/Timer.tsx` — panggil `sendNotification` saat `handleComplete()` jika tab tidak fokus (`document.hidden`)
- `src/components/Settings.tsx` — toggle "Notifikasi sesi selesai" di bagian Otomatisasi
- `src/types.ts` — tambah `notifyOnComplete: boolean` ke `TimerSettings`
- `src/lib/storage.ts` — default `notifyOnComplete: true`

**Verifikasi:** Buka app, mulai sesi fokus, pindah ke tab lain, tunggu timer habis → notifikasi muncul.

---

## Fitur 2: Target Harian

**Prioritas:** Tinggi | **Estimasi:** 45 menit

User set berapa sesi fokus yang ingin dicapai hari ini. Timer menampilkan progress (mis: 3/5 sesi). Statistik menampilkan pencapaian target.

**Yang perlu diubah:**
- `src/types.ts` — tambah `dailyTarget: number` ke `TimerSettings`
- `src/lib/storage.ts` — default `dailyTarget: 4`
- `src/components/Timer.tsx` — di bawah ring timer, tampilkan progress bar: "3 dari 5 sesi hari ini ▰▰▰▰▱"
- `src/components/Stats.tsx` — tambah kartu "Target Hari Ini" dengan centang hijau jika tercapai
- `src/components/Settings.tsx` — input number untuk target harian (1–20)
- `src/App.tsx` — hitung sesi hari ini dari `sessions` (filter by date)

**Verifikasi:** Set target 4, selesaikan 3 sesi → timer tampil "3 dari 4 sesi". Sesi ke-4 selesai → muncul "Target tercapai! 🎉".

---

## Fitur 3: Ekspor Data

**Prioritas:** Sedang | **Estimasi:** 25 menit

User bisa ekspor riwayat sesi ke file CSV. Tombol di tab Statistik bagian bawah.

**Yang perlu diubah:**
- `src/lib/export.ts` — file baru: `exportSessionsCSV(sessions)` — generate CSV string + trigger download via Blob + URL.createObjectURL
- `src/components/Stats.tsx` — tambah tombol "Ekspor CSV" di bagian bawah riwayat, icon `Download`
- CSV columns: Tanggal, Tipe (Fokus/Istirahat), Durasi (detik), Tugas, Jam Mulai

**Verifikasi:** Klik "Ekspor CSV" → browser download file `.csv` dengan data sesi yang benar. Buka di Excel → kolom sesuai.

---

## Fitur 4: Timer Kustom

**Prioritas:** Sedang | **Estimasi:** 40 menit

User bisa menjalankan timer bebas (bukan hanya preset Pomodoro), misal deep work 90 menit. Mode "Kustom" muncul di samping Sesi Fokus/Break.

**Yang perlu diubah:**
- `src/types.ts` — tambah `customDuration: number` ke `TimerSettings`
- `src/components/Timer.tsx` — tambah mode keempat `'custom'` di MODE_META dengan warna aksen yang berbeda (misal ungu/indigo), tampil di mode switcher
- `src/components/Settings.tsx` — input durasi kustom (1–180 menit) di bagian Durasi Sesi
- `src/lib/storage.ts` — default `customDuration: 60`
- Sesi kustom dicatat dengan `type: 'custom'` di `StudySession.type`

**Verifikasi:** Pilih mode "Kustom" di timer, set 90 menit di Settings → timer hitung mundur 90 menit, sesi tercatat di statistik.

---

## Fitur 5: Streak & Gamifikasi

**Prioritas:** Rendah | **Estimasi:** 60 menit

Motivasi pengguna dengan menghitung streak hari berturut-turut menyelesaikan minimal 1 sesi fokus. Tampil di Timer sebagai badge kecil. Statistik menampilkan streak terpanjang.

**Yang perlu diubah:**
- `src/lib/streak.ts` — file baru: `getCurrentStreak(sessions)`, `getLongestStreak(sessions)` — hitung dari array sessions
- `src/components/Timer.tsx` — badge streak di dekat progress bar: 🔥 7 hari
- `src/components/Stats.tsx` — tambah kartu "Streak Terbaik" (🔥 14 hari)
- Gunakan date-fns atau native Date untuk perhitungan hari berurutan

**Verifikasi:** Buat data dummy 5 hari berturut-turut → timer tampil "🔥 5 hari". Statistik tampil streak terpanjang. Satu hari kosong → streak reset ke 0.

---

## Fitur 6: Tag/Kategori Tugas

**Prioritas:** Rendah | **Estimasi:** 45 menit

User bisa memberi tag pada tugas (mis: "Kuliah", "Kerja", "Personal"). Statistik bisa difilter per tag.

**Yang perlu diubah:**
- `src/types.ts` — tambah `tag?: string` ke `TodoItem`
- `src/components/Todos.tsx` — dropdown tag saat tambah tugas (preset: Kuliah, Kerja, Personal, Olahraga, Lainnya)
- `src/components/Stats.tsx` — filter dropdown tag di atas chart, filter sessions berdasarkan `taskId` → `todo.tag`
- `src/App.tsx` — state `statsTagFilter`, oper ke Stats
- Data tag disimpan di todo, sesi tetap menyimpan `taskId` untuk lookup tag

**Verifikasi:** Tambah tugas dengan tag "Kuliah", selesaikan sesi → di Statistik filter "Kuliah" hanya menampilkan data sesi terkait.

---

## Urutan Implementasi yang Direkomendasikan

| # | Fitur | Mengapa duluan |
|---|---|---|
| 1 | **Notifikasi Browser** | Dampak langsung terasa, kode sederhana |
| 2 | **Target Harian** | Melengkapi notifikasi — user dapat target + notifikasi saat capai |
| 3 | **Ekspor Data** | Memberi user kontrol atas data mereka |
| 4 | **Timer Kustom** | Fleksibilitas penggunaan di luar Pomodoro |
| 5 | **Streak & Gamifikasi** | Motivasi jangka panjang |
| 6 | **Tag/Kategori** | Kompleksitas tertinggi — paling baik dikerjakan setelah fitur lain stabil |

---

## Risiko & Catatan

- **Notifikasi:** Perlu permission `Notification.requestPermission()`. Beberapa browser (iOS Safari) tidak mendukung Web Notification. Fallback: abaikan di iOS.
- **Ekspor CSV:** File bisa besar jika user punya ribuan sesi. Batasi ke 10.000 sesi terakhir.
- **Timer Kustom:** Jangan bentrok dengan overtime tracking. Mode kustom TIDAK pakai overtime — langsung auto-complete seperti break.
- **Streak:** Gunakan zona waktu lokal (`getLocalDateString` yang sudah ada). Hati-hati dengan perbedaan WIB/server time.
- **Tag:** Backward-compatible — todo tanpa tag tetap berfungsi normal. Filter "Semua" jadi default.
- **Semua fitur:** Tambahkan test integration sederhana via `Vitest` kalau sudah ada test setup, atau minimal verifikasi build + manual test.

---

*Rencana dibuat 2026-08-10. Setiap fitur independen — bisa dikerjakan paralel atau berurutan.*
