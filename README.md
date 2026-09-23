# 🤖 Bot Telegram Server Multifungsi (User & Admin Menu)

Bot Telegram multifungsi berbasis Node.js & Telegraf yang dirancang khusus untuk kemudahan pengelolaan server/VPS, dilengkapi pemisahan hak akses antara **Menu Pengguna (User)** dan **Panel Kendali (Admin)**.

Lokasi folder proyek: `C:\Users\dimas\Documents\telegram-bot`

---

## 🌟 Fitur Utama

### 1. 👤 Menu User (Tampilan Interaktif Ber-Banner)
- **🖼️ Foto Banner Dinamis**: Menampilkan foto banner aktif dengan caption sambutan dan inline buttons menu.
- **📥 All Video Downloader**:
  - Download video/audio tanpa watermark dari berbagai platform: **TikTok, Instagram (Reels/Post), YouTube, Facebook, Twitter/X, CapCut, Pinterest**.
  - Cukup kirimkan link langsung ke bot atau gunakan perintah `/dl <link>`.
- **🔗 URL Shortener**:
  - Memendekkan tautan panjang secara otomatis dengan multi-provider fallback (**is.gd**, **TinyURL**, **CleanURI**).
  - Perintah: `/short <link>`.
- **🎵 Playlist Musik Bot**:
  - Pengguna dapat mendengarkan koleksi lagu/audio yang telah ditambahkan oleh Admin langsung di Telegram.
- **🎮 Game Zone Interaktif**:
  - **Tebak Angka (1-100)** dengan petunjuk otomatis (terlalu besar / terlalu kecil).
  - **Kuis Tebak-tebakan Santai** dengan clue dan jawaban.
  - **Lempar Dadu Telegram** (adu skor dadu kamu vs bot).
  - **Mesin Slot Keberuntungan** dengan jackpot 777.
  - **Gunting Batu Kertas (Suit)**.
- **🛠️ Tools & Utilitas**:
  - **QR Code Generator**: Kirim `/qr <teks>` untuk mendapatkan gambar barcode QR beresolusi tinggi.
  - **Text-to-Speech (TTS)**: Kirim `/tts <teks>` untuk diubah jadi voice note suara jernih.
  - **Kalkulator Cepat**: Hitung rumus matematika dengan `/calc <ekspresi>`.
  - **Status & Ping Server**: Cek latensi, uptime, RAM terpakai, dan spesifikasi CPU server Anda.
  - **Kata Mutiara Harian**: Random quotes motivasi.

---

### 2. 👑 Menu Admin (Panel Kendali Khusus)
Akses hanya diberikan kepada User ID yang terdaftar sebagai Admin atau Owner.
- **🖼️ Edit Foto Banner Bot**:
  - Admin cukup memilih menu "Edit Foto Banner" lalu langsung mengirimkan **foto baru** dari galeri Telegram atau mengirim link gambar (URL). Banner utama bot akan seketika berubah untuk semua user.
- **🎶 Nambahin Musik di Bot**:
  - Admin cukup mengirimkan **file audio / MP3** langsung ke chat bot, atau mengirim format teks: `Judul Lagu | URL_MP3`. Bot otomatis mendaftarkannya ke playlist publik.
- **👥 Tambah & Kelola Admin**:
  - Tambahkan admin baru dengan mengirimkan Telegram User ID mereka.
  - Lihat daftar seluruh admin aktif atau hapus admin menggunakan `/deladmin <id>`.
- **📢 Broadcast Pengumuman**:
  - Kirim pesan pengumuman massal ke seluruh user yang pernah berinteraksi dengan bot.
- **📊 Statistik Bot**:
  - Memantau jumlah user, statistik unduhan, total game yang dimainkan, dan status server.

---

## 🚀 Panduan Setup & Instalasi

### 1. Dapatkan Bot Token & User ID
1. Buka Telegram dan cari **[@BotFather](https://t.me/botfather)**.
2. Ketik `/newbot`, ikuti langkahnya sampai mendapatkan **HTTP API Token**.
3. Cari **[@userinfobot](https://t.me/userinfobot)** di Telegram untuk melihat **Telegram User ID** Anda sendiri (berupa deretan angka).

### 2. Konfigurasi File `.env`
Buka file `.env` di folder proyek ini (`C:\Users\dimas\Documents\telegram-bot\.env`) dan masukkan data Anda:
```env
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
OWNER_ID=123456789
PORT=3000
```

### 3. Menjalankan Bot

#### Mode Standar (Pengujian Langsung):
```bash
npm start
```

#### Mode Background di VPS / Server (24/7 Aktif dengan PM2):
Jika Anda punya PM2 di server:
```bash
# Menyalakan bot sebagai background service
pm2 start src/index.js --name "tele-bot"

# Cek status bot
pm2 status

# Cek log bot realtime
pm2 logs tele-bot

# Simpan agar otomatis hidup jika server restart
pm2 save
```

---

## 📋 Daftar Perintah Lengkap (Command List)

| Perintah | Deskripsi | Hak Akses |
|---|---|---|
| `/start` atau `/menu` | Membuka Menu Utama dengan Banner Foto | Semua User |
| `/dl <link>` | Mengunduh video (TikTok, IG, YT, FB, dll) | Semua User |
| `/short <link>` | Memendekkan tautan panjang | Semua User |
| `/qr <teks>` | Membuat gambar QR Code | Semua User |
| `/tts <teks>` | Mengubah teks jadi pesan suara (VN) | Semua User |
| `/calc <rumus>` | Kalkulator matematika cepat | Semua User |
| `/game` | Membuka arena Game Zone | Semua User |
| `/musik` | Membuka koleksi playlist lagu | Semua User |
| `/ping` | Menampilkan latensi dan spesifikasi server | Semua User |
| `/help` | Menampilkan panduan dan daftar perintah | Semua User |
| `/admin` | Membuka Dashboard Panel Admin | Khusus Admin |
| `/addadmin <id>` | Menambahkan Admin baru | Khusus Admin |
| `/deladmin <id>` | Menghapus user dari Admin | Khusus Admin |

---

## 🗄️ Struktur Direktori Proyek

```
telegram-bot/
├── data/
│   ├── database.json          # Persistensi data JSON (banner, musik, admin, user, stats)
│   └── assets/                # Aset media lokal pendukung
├── src/
│   ├── config.js              # Loader environment variables
│   ├── db.js                  # Modul pembaca & penulis database JSON
│   ├── middlewares/
│   │   └── auth.js            # Middleware verifikasi admin & tracking user
│   ├── menus/
│   │   ├── userMenu.js        # Generator User Menu (Banner foto & buttons)
│   │   └── adminMenu.js       # Generator Admin Dashboard & state sessions
│   ├── features/
│   │   ├── downloader.js      # Multi-platform video downloader scraper
│   │   ├── shorturl.js        # Multi-provider URL shortener
│   │   ├── music.js           # Pengelola playlist pemutar musik Telegram
│   │   ├── games.js           # Tebak Angka, Kuis, Dadu, Mesin Slot, Suit
│   │   └── tools.js           # QR Code, TTS, Server Specs, Kalkulator, Quotes
│   └── index.js               # Entry point utama bot Telegraf
├── .env                       # File konfigurasi token & ID admin
├── .env.example               # Template environment
├── package.json               # Dependensi & skrip bot
├── test.js                    # Unit test runner
└── README.md                  # Panduan dokumentasi
```
