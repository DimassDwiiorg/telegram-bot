const db = require('../db');

function getMainUserMenu(userId, firstName) {
  const banner = db.getBanner();
  const isAdmin = db.isAdmin(userId);
  const dbData = db.getDb();
  const botName = (dbData.settings && dbData.settings.bot_name) || 'Dimzz Bot';
  const stats = dbData.stats || {};
  const totalDl = stats.total_downloads || 0;
  const totalShort = stats.total_shortlinks || 0;

  const caption = 
`╭───「 👑 *${botName.toUpperCase()}* 」
├ 👋 Hai, *${firstName || 'Pengguna'}*!
├ 💎 Status: *${isAdmin ? 'OWNER / VIP ADMIN 🛡️' : 'PREMIUM USER ⭐'}*
├ 📊 Total Download: \`${totalDl}\` | Shortlink: \`${totalShort}\`
╰───────────────────────────

╭───「 🌟 *MENU UTAMA* 」
├ ⚡ *Downloader* ➔ All-in-one Video & Audio
├ 🔗 *Shortener* ➔ Buat Tautan Cepat & Ringkas
├ 🎵 *Musik* ➔ Putar Koleksi Lagu Favorit
├ 🎮 *Game Zone* ➔ 10+ Game Seru & Asik
├ 🛠️ *Utilitas* ➔ 15+ Tools Premium
├ 🕌 *Jadwal Sholat* ➔ Waktu Sholat Jabodetabek
├ 🎭 *Fun Zone* ➔ Jokes, Fakta & Hiburan
╰───────────────────────────

👉 *Pilih tombol layanan di bawah ini:*`;

  const inlineKeyboard = [
    [
      { text: '📥 ❲ VIDEO DOWNLOADER ❳', callback_data: 'menu_downloader' },
      { text: '🔗 ❲ SHORTEN URL ❳', callback_data: 'menu_shorturl' }
    ],
    [
      { text: '🎵 ❲ PLAYLIST MUSIK ❳', callback_data: 'menu_music' },
      { text: '🎮 ❲ GAME ZONE ❳', callback_data: 'menu_games' }
    ],
    [
      { text: '🛠️ ❲ TOOLS & UTILITAS ❳', callback_data: 'menu_tools' },
      { text: '🎭 ❲ FUN ZONE ❳', callback_data: 'menu_fun' }
    ],
    [
      { text: '🕌 ❲ JADWAL SHOLAT ❳', callback_data: 'tool_sholat' },
      { text: '⚡ ❲ SERVER STATUS ❳', callback_data: 'action_ping' }
    ],
    [
      { text: '📖 ❲ PANDUAN LENGKAP ❳', callback_data: 'menu_help' }
    ]
  ];

  if (isAdmin) {
    inlineKeyboard.push([
      { text: '👑 ❲ DASHBOARD ADMIN ❳ ⚡', callback_data: 'menu_admin' }
    ]);
  }

  return {
    banner,
    caption,
    inlineKeyboard
  };
}

function getDownloaderMenu() {
  const text = 
`╭───「 📥 *UNIVERSAL MEDIA DOWNLOADER* 」
├ ⚡ *Mendukung 15+ Platform Populer:*
├ ├ 🎵 *TikTok* ➔ No Watermark Video & Audio
├ ├ 📸 *Instagram* ➔ Reels, Post, Story, Foto
├ ├ 🎥 *YouTube* ➔ Video MP4 & Audio MP3
├ ├ 📘 *Facebook* ➔ Video HD, Watch & Reels
├ ├ ✖️ *X / Twitter* ➔ Video HD & Audio
├ ├ 🎧 *Spotify* ➔ Lagu MP3 & Audio HD
├ ├ ☁️ *SoundCloud* ➔ Audio Track
├ ├ 🍏 *Apple Music* ➔ Audio Track
├ ├ 🧵 *Threads* ➔ Video & Post
├ ├ 📌 *Pinterest* ➔ Video & Gambar HD
├ ├ 📺 *Bilibili* ➔ Video HD
├ ├ 🇨🇳 *Douyin* ➔ Video HD No WM
├ ├ 📕 *RedNote (小红书)* ➔ Video & Gambar
├ ├ 🎸 *Bandcamp* ➔ Audio Track
├ ├ 🎨 *Pixiv* ➔ Ilustrasi & Artwork
├ └ ✂️ *CapCut* ➔ Template & Video
╰───────────────────────────

╭───「 💡 *CARA PENGGUNAAN* 」
├ 1️⃣ Kirim *link media langsung* ke obrolan
├ 2️⃣ Atau gunakan perintah:
├ └ \`/dl https://link-media-anda.com\`
╰───────────────────────────`;

  const inlineKeyboard = [
    [{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

function getShorturlMenu() {
  const text = 
`╭───「 🔗 *URL SHORTENER PREMIUM* 」
├ ⚡ Perpendek link panjang agar ringkas dan rapi
├ 🌐 Multi-Provider: is.gd, TinyURL, CleanURI
╰───────────────────────────

╭───「 💡 *CARA PENGGUNAAN* 」
├ Ketik perintah:
├ └ \`/short https://link-panjang-anda.com/123\`
╰───────────────────────────`;

  const inlineKeyboard = [
    [{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

function getGamesMenu() {
  const text = 
`╭───「 🎮 *GAME ZONE PREMIUM* 」
├ 🕹️ Pilih permainan seru untuk mengisi waktu!
├ 🏆 10+ game menantang tersedia untukmu
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '🔢 ❲ Tebak Angka ❳', callback_data: 'game_number_start' },
      { text: '🧩 ❲ Kuis Asah Otak ❳', callback_data: 'game_quiz_start' }
    ],
    [
      { text: '🎲 ❲ Lempar Dadu ❳', callback_data: 'game_dice' },
      { text: '🎰 ❲ Slot Jackpot ❳', callback_data: 'game_slot' }
    ],
    [
      { text: '✊ ❲ Suit ❳', callback_data: 'game_suit_menu' },
      { text: '🪙 ❲ Coin Flip ❳', callback_data: 'game_coinflip' }
    ],
    [
      { text: '🔮 ❲ Magic 8-Ball ❳', callback_data: 'game_8ball_help' },
      { text: '🧮 ❲ Math Challenge ❳', callback_data: 'game_math_start' }
    ],
    [
      { text: '📝 ❲ Tebak Kata ❳', callback_data: 'game_word_start' },
      { text: '🎯 ❲ Trivia Quiz ❳', callback_data: 'game_trivia_start' }
    ],
    [
      { text: '😜 ❲ Emoji Puzzle ❳', callback_data: 'game_emoji_start' },
      { text: '🍀 ❲ Lucky Number ❳', callback_data: 'game_lucky' }
    ],
    [
      { text: '🔥 ❲ Truth or Dare ❳', callback_data: 'game_tod_menu' },
      { text: '🤔 ❲ Would You Rather ❳', callback_data: 'game_wyr' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard };
}

function getSuitMenu() {
  const text = 
`╭───「 ✊✌️✋ *GUNTING BATU KERTAS* 」
├ 🎯 Pilih pilihanmu untuk menantang Bot:
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '✊ ❲ BATU ❳', callback_data: 'suit_batu' },
      { text: '✌️ ❲ GUNTING ❳', callback_data: 'suit_gunting' },
      { text: '✋ ❲ KERTAS ❳', callback_data: 'suit_kertas' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE GAME ❳', callback_data: 'menu_games' }
    ]
  ];
  return { text, inlineKeyboard };
}

function getTodMenu() {
  const text =
`╭───「 🔥 *TRUTH OR DARE* 」
├ 🎯 Pilih tantanganmu:
├ 💬 *Truth* ➔ Jawab pertanyaan jujur
├ ⚡ *Dare* ➔ Lakukan tantangan berani
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '💬 ❲ TRUTH ❳', callback_data: 'game_truth' },
      { text: '⚡ ❲ DARE ❳', callback_data: 'game_dare' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE GAME ❳', callback_data: 'menu_games' }
    ]
  ];
  return { text, inlineKeyboard };
}

function getToolsMenu() {
  const text = 
`╭───「 🛠️ *UTILITAS & TOOLS PREMIUM* 」
├ ⚡ 15+ Tools cepat & instan di Telegram:
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '📱 ❲ QR Code ❳', callback_data: 'tool_qrcode_help' },
      { text: '🗣️ ❲ Text to Speech ❳', callback_data: 'tool_tts_help' }
    ],
    [
      { text: '💡 ❲ Kata Bijak ❳', callback_data: 'tool_quote' },
      { text: '🧮 ❲ Kalkulator ❳', callback_data: 'tool_calc_help' }
    ],
    [
      { text: '🌤️ ❲ Cuaca ❳', callback_data: 'tool_weather_help' },
      { text: '🌐 ❲ Translate ❳', callback_data: 'tool_translate_help' }
    ],
    [
      { text: '📚 ❲ Wikipedia ❳', callback_data: 'tool_wiki_help' },
      { text: '💱 ❲ Kurs Mata Uang ❳', callback_data: 'tool_currency_help' }
    ],
    [
      { text: '🔐 ❲ Password Gen ❳', callback_data: 'tool_password' },
      { text: '🔄 ❲ Base64 ❳', callback_data: 'tool_base64_help' }
    ],
    [
      { text: '🌍 ❲ IP Lookup ❳', callback_data: 'tool_ip_help' },
      { text: '🎨 ❲ Random Color ❳', callback_data: 'tool_color' }
    ],
    [
      { text: '✍️ ❲ Fancy Text ❳', callback_data: 'tool_fancy_help' },
      { text: '📊 ❲ Word Counter ❳', callback_data: 'tool_wc_help' }
    ],
    [
      { text: '🎂 ❲ Hitung Umur ❳', callback_data: 'tool_age_help' },
      { text: '⚖️ ❲ BMI Calculator ❳', callback_data: 'tool_bmi_help' }
    ],
    [
      { text: '🏛️ ❲ Angka Romawi ❳', callback_data: 'tool_roman_help' },
      { text: '⏳ ❲ Countdown ❳', callback_data: 'tool_countdown_help' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard };
}

function getFunMenu() {
  const text =
`╭───「 🎭 *FUN ZONE PREMIUM* 」
├ 😂 Zona hiburan & keseruan tanpa batas!
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '😂 ❲ Random Joke ❳', callback_data: 'fun_joke' },
      { text: '🧠 ❲ Fakta Unik ❳', callback_data: 'fun_fact' }
    ],
    [
      { text: '🐕 ❲ Foto Anjing ❳', callback_data: 'fun_dog' },
      { text: '🐱 ❲ Foto Kucing ❳', callback_data: 'fun_cat' }
    ],
    [
      { text: '♈ ❲ Ramalan Zodiak ❳', callback_data: 'fun_zodiac_menu' },
      { text: '🕌 ❲ Jadwal Sholat ❳', callback_data: 'tool_sholat' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard };
}

function getZodiacMenu() {
  const text =
`╭───「 ♈ *RAMALAN ZODIAK HARIAN* 」
├ 🔮 Pilih zodiak kamu:
╰───────────────────────────`;

  const inlineKeyboard = [
    [
      { text: '♈ Aries', callback_data: 'zodiac_aries' },
      { text: '♉ Taurus', callback_data: 'zodiac_taurus' },
      { text: '♊ Gemini', callback_data: 'zodiac_gemini' }
    ],
    [
      { text: '♋ Cancer', callback_data: 'zodiac_cancer' },
      { text: '♌ Leo', callback_data: 'zodiac_leo' },
      { text: '♍ Virgo', callback_data: 'zodiac_virgo' }
    ],
    [
      { text: '♎ Libra', callback_data: 'zodiac_libra' },
      { text: '♏ Scorpio', callback_data: 'zodiac_scorpio' },
      { text: '♐ Sagitarius', callback_data: 'zodiac_sagittarius' }
    ],
    [
      { text: '♑ Capricorn', callback_data: 'zodiac_capricorn' },
      { text: '♒ Aquarius', callback_data: 'zodiac_aquarius' },
      { text: '♓ Pisces', callback_data: 'zodiac_pisces' }
    ],
    [
      { text: '🔙 ❲ KEMBALI ❳', callback_data: 'menu_fun' }
    ]
  ];
  return { text, inlineKeyboard };
}

function getHelpMenu() {
  const text = 
`╭───「 📖 *PANDUAN & DAFTAR PERINTAH* 」
├ 🔹 \`/start\` ➔ Buka Menu Utama & Banner
├ 🔹 \`/dl <url>\` ➔ Download video/audio
├ 🔹 \`/short <url>\` ➔ Buat shortlink instan
├ 🔹 \`/qr <teks>\` ➔ Generate gambar QR Code
├ 🔹 \`/tts <teks>\` ➔ Ubah teks jadi suara VN
├ 🔹 \`/calc <rumus>\` ➔ Kalkulator matematika
├ 🔹 \`/cuaca <kota>\` ➔ Cek cuaca terkini
├ 🔹 \`/translate <teks>\` ➔ Terjemahkan teks
├ 🔹 \`/wiki <topik>\` ➔ Cari di Wikipedia
├ 🔹 \`/kurs <jumlah> <dari> <ke>\` ➔ Konversi mata uang
├ 🔹 \`/ip <alamat>\` ➔ IP address lookup
├ 🔹 \`/umur <YYYY-MM-DD>\` ➔ Hitung umur
├ 🔹 \`/bmi <berat> <tinggi>\` ➔ Hitung BMI
├ 🔹 \`/8ball <pertanyaan>\` ➔ Tanya Magic 8-Ball
├ 🔹 \`/fancy <teks>\` ➔ Bikin teks keren
├ 🔹 \`/ping\` ➔ Cek kecepatan respon server
├ 🔹 \`/game\` ➔ Akses game zone
├ 🔹 \`/musik\` ➔ Putar playlist lagu
├ 🔹 \`/sholat\` ➔ Lihat jadwal sholat
├ 🔹 \`/admin\` ➔ Panel khusus Admin/Owner
╰───────────────────────────`;

  const inlineKeyboard = [
    [{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

module.exports = {
  getMainUserMenu,
  getDownloaderMenu,
  getShorturlMenu,
  getGamesMenu,
  getSuitMenu,
  getTodMenu,
  getToolsMenu,
  getFunMenu,
  getZodiacMenu,
  getHelpMenu
};
