const db = require('../db');

function getMainUserMenu(userId, firstName) {
  const banner = db.getBanner();
  const isAdmin = db.isAdmin(userId);
  const dbData = db.getDb();
  const botName = (dbData.settings && dbData.settings.bot_name) || 'Dimzz Bot';

  const caption = `👋 Halo *${firstName || 'Pengguna'}*!\nSelamat datang di *${botName}* 🤖⚡\n\n` +
    `Bot multifungsi siap melayani kebutuhan download video, shortlink, musik, games santai, dan utilitas bermanfaat.\n\n` +
    `👇 *Silakan pilih menu layanan di bawah ini:*`;

  const inlineKeyboard = [
    [
      { text: '📥 Video Downloader', callback_data: 'menu_downloader' },
      { text: '🔗 Shorten URL', callback_data: 'menu_shorturl' }
    ],
    [
      { text: '🎵 Playlist Musik', callback_data: 'menu_music' },
      { text: '🎮 Game Zone', callback_data: 'menu_games' }
    ],
    [
      { text: '🛠️ Utilitas & Tools', callback_data: 'menu_tools' },
      { text: '📊 Status Server', callback_data: 'action_ping' }
    ],
    [
      { text: 'ℹ️ Panduan Singkat', callback_data: 'menu_help' }
    ]
  ];

  // If user is admin, add Admin Panel button
  if (isAdmin) {
    inlineKeyboard.push([
      { text: '👑 Buka Panel Admin', callback_data: 'menu_admin' }
    ]);
  }

  return {
    banner,
    caption,
    inlineKeyboard
  };
}

function getDownloaderMenu() {
  const text = `📥 *ALL VIDEO DOWNLOADER*\n\n` +
    `Kamu bisa mendownload video atau audio tanpa watermark dari:\n` +
    `• 🎵 *TikTok* (No Watermark)\n` +
    `• 📸 *Instagram* (Reels, Post, Story)\n` +
    `• 🎥 *YouTube* (Video & Audio)\n` +
    `• 📘 *Facebook* (Public Video & Reels)\n` +
    `• ✖️ *X / Twitter*\n` +
    `• ✂️ *CapCut*\n` +
    `• 📌 *Pinterest*\n\n` +
    `💡 *Cara Penggunaan:*\n` +
    `Langsung *kirimkan link tautan video* ke bot ini, atau ketik:\n` +
    `\`\`\`\n/dl https://vt.tiktok.com/xxxx/\n\`\`\``;

  const inlineKeyboard = [
    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

function getShorturlMenu() {
  const text = `🔗 *URL SHORTENER (PEMENDEK TAUTAN)*\n\n` +
    `Perpendek link panjang agar rapi dan mudah dibagikan menggunakan berbagai layanan cepat (is.gd, TinyURL, CleanURI).\n\n` +
    `💡 *Cara Penggunaan:*\n` +
    `Ketik perintah:\n` +
    `\`\`\`\n/short https://link-panjang-anda.com/sub/page/123\n\`\`\``;

  const inlineKeyboard = [
    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

function getGamesMenu() {
  const text = `🎮 *GAME ZONE SANTAI*\n\n` +
    `Sekarang ada *11 permainan* seru buat mengisi waktu luangmu. Pilih salah satu di bawah ini:`;

  const inlineKeyboard = [
    [
      { text: '🔢 Tebak Angka (1-100)', callback_data: 'game_number_start' },
      { text: '🧩 Kuis Tebak-tebakan', callback_data: 'game_quiz_start' }
    ],
    [
      { text: '🔤 Tebak Kata Acak', callback_data: 'game_word_start' },
      { text: '🧮 Hitung Cepat', callback_data: 'game_math_start' }
    ],
    [
      { text: '🎲 Lempar Dadu', callback_data: 'game_dice' },
      { text: '🎰 Mesin Slot', callback_data: 'game_slot' }
    ],
    [
      { text: '🏀 Basket', callback_data: 'game_sport_basket' },
      { text: '⚽ Bola', callback_data: 'game_sport_bola' }
    ],
    [
      { text: '🎯 Panah', callback_data: 'game_sport_panah' },
      { text: '🎳 Boling', callback_data: 'game_sport_boling' }
    ],
    [
      { text: '✊ Gunting Batu Kertas', callback_data: 'game_suit_menu' }
    ],
    [
      { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard };
}

function getSuitMenu() {
  const text = `✊✌️✋ *GUNTING BATU KERTAS*\n\nPilih jagoanmu melawan bot:`;
  const inlineKeyboard = [
    [
      { text: '✊ Batu', callback_data: 'suit_batu' },
      { text: '✌️ Gunting', callback_data: 'suit_gunting' },
      { text: '✋ Kertas', callback_data: 'suit_kertas' }
    ],
    [
      { text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }
    ]
  ];
  return { text, inlineKeyboard };
}

function getToolsMenu() {
  const text = `🛠️ *UTILITAS & TOOLS BERMANFAAT*\n\nPilih salah satu tools di bawah ini:`;

  const inlineKeyboard = [
    [
      { text: '📱 Buat QR Code', callback_data: 'tool_qrcode_help' },
      { text: '🗣️ Text to Speech (VN)', callback_data: 'tool_tts_help' }
    ],
    [
      { text: '💡 Kata Bijak Hari Ini', callback_data: 'tool_quote' },
      { text: '🧮 Hitung Cepat (/calc)', callback_data: 'tool_calc_help' }
    ],
    [
      { text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard };
}

function getHelpMenu() {
  const text = `ℹ️ *DAFTAR PERINTAH LENGKAP BOT*\n\n` +
    `🔹 */start* atau */menu* - Tampilkan Menu Utama & Foto Banner\n` +
    `🔹 */dl <link>* - Download video TikTok, IG, YT, FB, dll\n` +
    `🔹 */short <link>* - Perpendek tautan URL\n` +
    `🔹 */qr <teks>* - Generate gambar QR Code langsung\n` +
    `🔹 */tts <teks>* - Ubah teks jadi suara voice note\n` +
    `🔹 */calc <angka/operasi>* - Hitung rumus matematika cepat\n` +
    `🔹 */ping* - Periksa kecepatan respon & status server\n` +
    `🔹 */game* - Buka menu Game Zone (11 permainan seru)\n` +
    `🔹 */musik* - Putar koleksi lagu bot\n` +
    `🔹 */admin* - Buka Panel Admin (Khusus Admin)`;

  const inlineKeyboard = [
    [{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]
  ];

  return { text, inlineKeyboard };
}

module.exports = {
  getMainUserMenu,
  getDownloaderMenu,
  getShorturlMenu,
  getGamesMenu,
  getSuitMenu,
  getToolsMenu,
  getHelpMenu
};
