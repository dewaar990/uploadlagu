# DeeRiZ Music System (Roblox Studio)

Sistem musik siap pakai yang **otomatis mendeteksi lagu** di DataStore `songiddeerizcorp`,
yang diisi oleh web DeeRiZ Corp Studios. Fitur:

- Membaca DataStore saat server mulai, lalu **cek ulang tiap 60 detik**. Lagu baru dari web muncul tanpa restart server.
- Mendukung format web (`{ soundId, name, uploadedBy, uploadedAt }`), angka biasa, maupun mode `per-id`.
- Data rusak/duplikat dibuang, dan ID yang bukan Audio dilewati (cek lewat MarketplaceService).
- UI pemutar musik (tombol **♪ Musik**): cari lagu, putar **pribadi** (hanya terdengar oleh pemain itu), next/stop/volume.
- **Radio server**: satu lagu untuk semua pemain, autoplay acak. Hanya **DJ** yang bisa mengganti/skip/stop.
- Mendeteksi audio yang **gagal dimuat**, lalu menandainya ⚠ dan otomatis melewatinya.

## Pemasangan

Buat 3 script di Roblox Studio, lalu salin isinya dari file di folder ini:

| Lokasi di Studio | Jenis | Nama | File |
|---|---|---|---|
| ReplicatedStorage | **ModuleScript** | `MusicShared` | `ReplicatedStorage/MusicShared.luau` |
| ServerScriptService | **Script** | `MusicServer` | `ServerScriptService/MusicServer.server.luau` |
| StarterPlayer › StarterPlayerScripts | **LocalScript** | `MusicClient` | `StarterPlayerScripts/MusicClient.client.luau` |

Nama `MusicShared` harus persis sama. Pengaturan ada di bagian `Config` dalam `MusicShared`.

Untuk mencoba di Studio: **Home › Game Settings › Security › Enable Studio Access to API Services** = ON.

## Kalau lagu tidak terdeteksi / tidak berbunyi

Lihat **Output** di Studio. Server mencetak `[MusicServer] N lagu terdeteksi dari DataStore ...`.

1. **0 lagu terdeteksi**
   - *Universe ID* di web harus milik **game yang sama** (Creator Hub › game › ⋯ › Copy Universe ID).
   - `STORE_NAME`, `STORE_SCOPE`, `MODE`, `ENTRY_KEY` di `Config` harus sama dengan pengaturan web
     (default: `songiddeerizcorp`, `global`, `list`, `SongList`).
   - Lagu baru masuk DataStore **setelah Approved** oleh Roblox. Cek statusnya di tab Riwayat di web.
   - Di Studio, pastikan *Enable Studio Access to API Services* menyala.
2. **Lagu muncul tapi ⚠ "Gagal dimuat"**: game tidak punya izin memakai audio tersebut.
   - Audio yang diupload atas nama **akun user** hanya bisa diputar di game milik user itu.
     Kalau game milik **grup**, upload audio sebagai grup (di web: *Upload sebagai: Grup* + Group ID),
     atau beri izin di Creator Hub › Audio › *Permissions* › tambahkan game kamu.
   - Audio yang ditolak moderasi juga tidak akan bisa diputar.
3. **Tombol radio tidak muncul**: hanya DJ yang bisa mengatur radio. DJ otomatis adalah pemilik game, rank
   tertinggi grup pemilik game, dan semua orang saat di Studio. Tambahkan DJ lain di `Config.DJ_USER_IDS`
   atau atur `DJ_GROUP_ID` / `DJ_MIN_RANK`.

## Keamanan

- Client hanya **meminta**; server yang memutuskan. `RadioCommand` dibatasi rate (1x/detik), dicek tipenya,
  hanya diterima dari DJ, dan SoundId **harus ada di DataStore**. Exploiter tidak bisa memutar audio sembarangan
  untuk semua pemain.
- Pemutaran pribadi berjalan di client dan hanya terdengar oleh pemain itu sendiri, jadi tidak berpengaruh ke pemain lain.
- Data dari DataStore dan dari server divalidasi ulang (`sanitizeList`) sebelum dipakai.

## Tes

Logika validasi data bisa dites dengan [Luau CLI](https://github.com/luau-lang/luau/releases):

```bash
cd roblox/MusicSystem/tests && luau MusicShared.test.luau
```
