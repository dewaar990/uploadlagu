# DeeRiZ Corp Studios — Upload Lagu ke Roblox

Web untuk:

1. **Upload lagu** (MP3, WAV, OGG, FLAC, M4A, dll. — bisa banyak sekaligus)
2. **Edit jadi speed 2x** dengan ffmpeg (mode *Speed*: nada ikut naik, atau *Tempo*: nada tetap; faktor & volume bisa diatur)
3. **Upload ke Roblox (Creator Hub)** lewat **Open Cloud API key**
4. **Verifikasi moderasi**: status dicek terus sampai Roblox menyatakan *Approved* atau *Rejected*
5. **SoundId otomatis disimpan ke DataStore `songiddeerizcorp`** (juga lewat API key) — hanya jika lagu **Approved**

Login memakai **ID Pelanggan + Password** (tanpa Discord). Akun pelanggan **hanya bisa dibuat oleh admin** dari halaman `/admin`.

## Halaman

| URL      | Isi |
|----------|-----|
| `/`      | Landing page (judul "DeeRiZ Corp Studios", pilihan bahasa ID/EN) |
| `/login` | Login ID pelanggan & password |
| `/app`   | Dashboard: Upload, Riwayat (status tiap lagu + SoundId), Pengaturan Roblox |
| `/admin` | Khusus admin: buat pelanggan, reset password, nonaktifkan, atur masa aktif, hapus |

## Menjalankan

Butuh **Node.js 18.17+** dan **ffmpeg** (`ffmpeg` + `ffprobe`) terpasang.

```bash
npm install
cp .env.example .env     # lalu isi ADMIN_PASSWORD (wajib) dan pengaturan Roblox
npm start                # http://localhost:3000
```

Masuk ke `/login` dengan `ADMIN_ID` / `ADMIN_PASSWORD`, lalu buat akun pelanggan di `/admin`.
Password pelanggan hanya ditampilkan sekali saat dibuat/di-reset — salin dan kirimkan ke pelanggan.

## Menyiapkan API key Roblox

1. Buka <https://create.roblox.com/dashboard/credentials> → **Create API Key**.
2. Tambahkan izin:
   - **Assets API**: `asset:read`, `asset:write`
   - **Universe DataStores** (pilih game kamu): `universe-datastores.objects:read`, `:create`, `:update`
3. Di *Accepted IP Addresses* isi IP server tempat web ini berjalan (atau `0.0.0.0/0`).
4. Catat:
   - **Creator ID** — User ID kamu, atau Group ID bila upload atas nama grup
   - **Universe ID** game (Creator Hub → game → ⋯ → *Copy Universe ID*)

Isi nilai tersebut di `.env` (default server) **atau** di tab *Pengaturan Roblox* pada dashboard
(setiap pelanggan bisa memakai akun Roblox sendiri). API key yang disimpan lewat web dienkripsi (AES-256-GCM).

Admin dapat menentukan apakah seorang pelanggan boleh memakai API key server (`.env`) bila
pelanggan belum mengisi API key sendiri (centang "Boleh memakai API key server").

## Format DataStore

Nama DataStore: `songiddeerizcorp` (ubah lewat `DATASTORE_NAME`).

- **`DATASTORE_MODE=list`** (default) — key `SongList` berisi array:
  ```json
  [{ "soundId": 123456789, "name": "Judul Lagu", "uploadedBy": "DRZ-123456", "uploadedAt": "2026-10-15T02:57:00.000Z" }]
  ```
- **`DATASTORE_MODE=per-id`** — setiap SoundId menjadi key sendiri dengan isi objek yang sama.

Contoh script Roblox untuk membaca daftar lagu: [`roblox/SongLoader.server.lua`](roblox/SongLoader.server.lua).

## Alur status

`Antri → Memproses audio → Upload ke Roblox → Cek moderasi → Simpan DataStore → Selesai`

- **Ditolak Roblox** — SoundId *tidak* disimpan ke DataStore.
- **Masih ditinjau** — moderasi belum selesai dalam `MODERATION_TIMEOUT_MS`; server mengecek ulang
  otomatis tiap `BACKGROUND_RECHECK_MS` (sampai 48 jam), atau tekan **Cek ulang moderasi**.
- **Gagal** — pesan error ditampilkan; tekan **Coba lagi** setelah memperbaiki pengaturan.

## Tes

```bash
npm test
```

Tes end-to-end memakai server Roblox tiruan (tidak memanggil Roblox asli): login admin, buat pelanggan,
upload lagu, cek durasi jadi 2x lebih cepat, moderasi Approved/Rejected, dan isi DataStore.

## Data

Semua data tersimpan di folder `data/` (bisa diubah dengan `DATA_DIR`): `customers.json`, `jobs.json`,
`secret.key`, dan file MP3 hasil proses (untuk preview). Jangan commit folder ini.

> Pastikan kamu punya hak atas lagu yang diupload. Lagu yang melanggar hak cipta atau aturan
> Roblox dapat ditolak dan berisiko pada akun Roblox kamu.
