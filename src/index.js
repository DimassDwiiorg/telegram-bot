const { Telegraf } = require('telegraf');
const config = require('./config');
const db = require('./db');
const { authMiddleware, adminOnly } = require('./middlewares/auth');
const userMenu = require('./menus/userMenu');
const adminMenu = require('./menus/adminMenu');
const downloader = require('./features/downloader');
const shorturl = require('./features/shorturl');
const music = require('./features/music');
const games = require('./features/games');
const tools = require('./features/tools');

const botStartTime = Date.now();

// Validasi Token
if (!config.botToken) {
  console.error('❌ ERROR: BOT_TOKEN belum diatur!');
  console.error('Silakan isi BOT_TOKEN di file .env sebelum menjalankan bot.');
  process.exit(1);
}

const bot = new Telegraf(config.botToken);

// Gunakan Middleware Auth & User Tracker
bot.use(authMiddleware);

// ==========================================
// HELPER SEND UTAMA: USER MENU DENGAN BANNER
// ==========================================
async function sendUserMainMenu(ctx) {
  const userId = ctx.from ? ctx.from.id : null;
  const firstName = ctx.from ? ctx.from.first_name : null;
  const { banner, caption, inlineKeyboard } = userMenu.getMainUserMenu(userId, firstName);

  // Jika dipanggil dari klik tombol (callback query), hapus pesan sebelumnya agar rapi
  if (ctx.callbackQuery) {
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (e) {}
  }

  try {
    // Kirim pesan baru berupa foto banner + caption + keyboard
    await ctx.replyWithPhoto(banner, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  } catch (err) {
    console.error('Error sendUserMainMenu:', err.message);
    // Jika banner gagal dimuat, kirim fallback teks
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }
}

// Helper untuk menampilkan menu baru sambil otomatis menghapus menu sebelumnya
async function renderMenu(ctx, text, inlineKeyboard) {
  try {
    await ctx.deleteMessage().catch(() => {});
  } catch (e) {}
  return ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Helper generik untuk game "duel dadu" (Dadu, Basket, Bola, Panah, Boling)
// Pola: user lempar -> bot lempar -> nilai lebih tinggi menang
async function playDiceDuel(ctx, emoji, label, callbackData) {
  await ctx.answerCbQuery(`Bermain ${label}...`);
  try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}

  try {
    await ctx.reply(`${emoji} *Giliranmu main ${label}:*`, { parse_mode: 'Markdown' });
    const userDice = await ctx.sendDice({ emoji });

    setTimeout(async () => {
      try {
        await ctx.reply(`🤖 *Giliran Bot main ${label}:*`, { parse_mode: 'Markdown' });
        const botDice = await ctx.sendDice({ emoji });

        setTimeout(async () => {
          try {
            const uVal = userDice.dice.value;
            const bVal = botDice.dice.value;
            let outcome = '🤝 Seri! Kita sama kuat.';
            if (uVal > bVal) outcome = `🎉 Kamu MENANG! Hasil kamu lebih tinggi!`;
            if (bVal > uVal) outcome = '🤖 Bot MENANG! Coba lagi ya.';

            db.incrementStat('total_games_played');
            await ctx.reply(`${emoji} *Hasil ${label}:*\n\nKamu: *${uVal}*\nBot: *${bVal}*\n\n${outcome}`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Main Lagi', callback_data: callbackData }],
                  [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
                ]
              }
            });
          } catch (err) {
            console.error(`${label} result error:`, err.message);
          }
        }, 3000);
      } catch (err) {
        console.error(`${label} bot-turn error:`, err.message);
      }
    }, 2500);
  } catch (err) {
    console.error(`${label} start error:`, err.message);
  }
}

// ==========================================
// COMMANDS DASAR
// ==========================================
bot.command(['start', 'menu'], async (ctx) => {
  // Reset admin session & game aktif jika ada
  adminMenu.clearAdminSession(ctx.from.id);
  games.clearAllGames(ctx.from.id);
  await sendUserMainMenu(ctx, false);
});

bot.command('help', async (ctx) => {
  const { text, inlineKeyboard } = userMenu.getHelpMenu();
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

bot.command('game', async (ctx) => {
  const { text, inlineKeyboard } = userMenu.getGamesMenu();
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

bot.command('musik', async (ctx) => {
  const { text, buttons } = music.formatMusicMenu();
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// ==========================================
// FITUR: DOWNLOADER (/dl <url>)
// ==========================================
// Escape karakter spesial Markdown (_ * ` [) agar judul/author dari hasil scrape
// (yang seringkali mengandung karakter ini) tidak membuat Telegram gagal parsing
// caption dan menganggap pengiriman video/audio "gagal" padahal cuma soal format teks.
function escapeMarkdown(text) {
  if (!text) return text;
  return String(text).replace(/([_*`[])/g, '\\$1');
}

async function handleDownloadRequest(ctx, url) {
  const waitMsg = await ctx.reply('⏳ *Sedang memproses dan mengunduh media... Mohon tunggu sebentar.*', { parse_mode: 'Markdown' });

  try {
    const result = await downloader.downloadMedia(url);

    if (!result.success) {
      await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      return ctx.reply(`❌ *Gagal Mengunduh:* ${result.error || 'Media tidak ditemukan atau link bermasalah.'}`, { parse_mode: 'Markdown' });
    }

    db.incrementStat('total_downloads');
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

    const dbData = db.getDb();
    const botDisplayName = (dbData.settings && dbData.settings.bot_name) || 'Bot';
    const caption = `✅ *DOWNLOAD BERHASIL!*\n\n` +
      `📌 *Platform:* ${result.platform}\n` +
      `📝 *Judul:* ${escapeMarkdown(result.title) || 'Video'}\n` +
      (result.author ? `👤 *Author:* ${escapeMarkdown(result.author)}\n` : '') +
      `\n⚡ _Diunduh melalui ${botDisplayName}_`;

    if (result.videoUrl) {
      try {
        await ctx.replyWithVideo(result.videoUrl, {
          caption: caption,
          parse_mode: 'Markdown'
        });
      } catch (vidErr) {
        console.error('Send Video Error:', vidErr.message);
        // Jika file terlalu besar atau Telegram gagal fetch dari URL, berikan link download langsung
        await ctx.reply(`${caption}\n\n📥 *Link Download Langsung:*\n${result.videoUrl}`, { parse_mode: 'Markdown' });
      }
    } else if (result.audioUrl) {
      try {
        await ctx.replyWithAudio(result.audioUrl, {
          caption: caption,
          parse_mode: 'Markdown'
        });
      } catch (audErr) {
        console.error('Send Audio Error:', audErr.message);
        // Sebelumnya kalau kirim audio gagal, bot cuma nampilin error generik tanpa link.
        // Sekarang disamakan dengan cabang video: tetap kasih link langsung ke user.
        await ctx.reply(`${caption}\n\n📥 *Link Download Langsung:*\n${result.audioUrl}`, { parse_mode: 'Markdown' });
      }
    } else {
      // Jaga-jaga: kalau entah bagaimana tidak ada videoUrl maupun audioUrl,
      // jangan diamkan user - kasih tahu secara jelas.
      await ctx.reply(`⚠️ Media ditemukan tapi tidak ada file yang bisa dikirim.\n\n${caption}`, { parse_mode: 'Markdown' });
    }

  } catch (error) {
    console.error('Download Handler Error:', error.message);
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`❌ *Error:* Gagal memproses media. Detail: ${error.message}`, { parse_mode: 'Markdown' });
  }
}

bot.command('dl', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/dl https://link-video.com`', { parse_mode: 'Markdown' });
  }
  await handleDownloadRequest(ctx, args);
});

// ==========================================
// FITUR: SHORT URL (/short <url>)
// ==========================================
bot.command('short', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/short https://link-panjang-anda.com`', { parse_mode: 'Markdown' });
  }

  const waitMsg = await ctx.reply('⏳ *Membuat shortlink...*', { parse_mode: 'Markdown' });

  try {
    const result = await shorturl.shortenUrl(args);
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

    if (result.success) {
      db.incrementStat('total_shortlinks');
      const text = `🎉 *SHORTLINK BERHASIL DIBUAT!*\n\n` +
        `🔗 *Short URL:* \`${result.shortUrl}\`\n` +
        `🌐 *Layanan:* ${result.provider}\n` +
        `📥 *Original:* ${args}\n\n` +
        `_Ketuk tautan untuk menyalin._`;
      await ctx.reply(text, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ *Gagal:* ${result.error}`, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`❌ *Error:* ${err.message}`, { parse_mode: 'Markdown' });
  }
});

// ==========================================
// FITUR: QR CODE (/qr <teks>)
// ==========================================
bot.command('qr', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/qr https://google.com` atau `/qr Teks Bebas`', { parse_mode: 'Markdown' });
  }

  try {
    const qrBuffer = await tools.generateQrBuffer(text);
    await ctx.replyWithPhoto({ source: qrBuffer }, {
      caption: `📱 *QR CODE GENERATOR*\n\n📄 *Data:* \`${text}\`\n⚡ _Scan kode di atas menggunakan kamera smartphone._`,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    await ctx.reply(`❌ Gagal membuat QR Code: ${err.message}`);
  }
});

// ==========================================
// FITUR: TEXT TO SPEECH (/tts <teks>)
// ==========================================
bot.command('tts', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/tts Halo apa kabar kawan`', { parse_mode: 'Markdown' });
  }

  try {
    const ttsUrl = tools.getTtsAudioUrl(text, 'id');
    await ctx.replyWithVoice({ url: ttsUrl }, {
      caption: `🗣️ *Text to Speech:*\n"${text}"`,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    await ctx.reply(`❌ Gagal memproses TTS: ${err.message}`);
  }
});

// ==========================================
// FITUR: KALKULATOR (/calc <ekspresi>)
// ==========================================
bot.command('calc', async (ctx) => {
  const expr = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!expr) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/calc 50 * 2 + 10`', { parse_mode: 'Markdown' });
  }

  const result = tools.calculateMath(expr);
  if (result !== null) {
    await ctx.reply(`🧮 *HASIL PERHITUNGAN:*\n\n🔢 \`${expr}\` = *${result}*`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Gagal menghitung. Pastikan rumus hanya berisi angka dan operator matematika valid (+, -, *, /, ^).');
  }
});

// ==========================================
// FITUR: PING & SERVER STATUS (/ping)
// ==========================================
async function replyPingStatus(ctx) {
  if (ctx.callbackQuery) {
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (e) {}
  }
  const start = Date.now();
  const pingMsg = await ctx.reply('📡 *Mengukur latensi server...*', { parse_mode: 'Markdown' });
  const latency = Date.now() - start;

  const specs = tools.getServerSpecs(botStartTime);
  const users = db.getUserList();
  const admins = db.getAdmins();

  const text = `⚡ *STATUS SERVER & SPESIFIKASI*\n\n` +
    `📶 *Latensi Bot:* \`${latency} ms\`\n` +
    `⏱️ *Bot Uptime:* \`${specs.uptime}\`\n` +
    `🖥️ *Sistem Operasi:* \`${specs.os}\`\n` +
    `🧠 *RAM Terpakai:* \`${specs.ram}\`\n` +
    `⚙️ *CPU:* \`${specs.cpu} (${specs.cpuCores} Cores)\`\n` +
    `🟢 *Node.js:* \`${specs.nodeVersion}\`\n\n` +
    `👥 *Total Pengguna:* \`${users.length} user\`\n` +
    `🛡️ *Total Admin:* \`${admins.length} admin\``;

  await ctx.telegram.editMessageText(ctx.chat.id, pingMsg.message_id, undefined, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]]
    }
  });
}

bot.command('ping', replyPingStatus);

// ==========================================
// ADMIN COMMANDS: /admin, /addadmin, /deladmin
// ==========================================
bot.command('admin', adminOnly, async (ctx) => {
  adminMenu.clearAdminSession(ctx.from.id);
  const { text, inlineKeyboard } = adminMenu.getAdminDashboard();
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

bot.command('addadmin', adminOnly, async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const targetId = parts[1] ? parts[1].trim() : null;
  if (!targetId || isNaN(targetId)) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/addadmin <Telegram_User_ID>`\nContoh: `/addadmin 123456789`', { parse_mode: 'Markdown' });
  }

  const success = db.addAdmin(targetId);
  if (success) {
    await ctx.reply(`✅ *Berhasil!* User ID \`${targetId}\` telah ditambahkan sebagai Admin Bot.`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`ℹ️ User ID \`${targetId}\` sudah menjadi admin sebelumnya.`);
  }
});

bot.command('deladmin', adminOnly, async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const targetId = parts[1] ? parts[1].trim() : null;
  if (!targetId) {
    return ctx.reply('⚠️ *Format salah!*\nGunakan: `/deladmin <Telegram_User_ID>`', { parse_mode: 'Markdown' });
  }

  if (targetId === String(config.ownerId)) {
    return ctx.reply('⛔ Tidak dapat menghapus Super Owner dari daftar admin!');
  }

  const success = db.removeAdmin(targetId);
  if (success) {
    await ctx.reply(`✅ *Berhasil!* User ID \`${targetId}\` telah dihapus dari Admin.`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`ℹ️ User ID \`${targetId}\` tidak ditemukan dalam daftar admin.`);
  }
});

// ==========================================
// CALLBACK QUERY HANDLERS (INLINE BUTTONS)
// ==========================================
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  // Navigasi Menu User
  if (data === 'menu_main') {
    adminMenu.clearAdminSession(userId);
    games.clearAllGames(userId);
    await ctx.answerCbQuery();
    return sendUserMainMenu(ctx);
  }

  if (data === 'menu_downloader') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getDownloaderMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_shorturl') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getShorturlMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_music') {
    await ctx.answerCbQuery();
    const { text, buttons } = music.formatMusicMenu();
    return renderMenu(ctx, text, buttons);
  }

  if (data.startsWith('play_music_')) {
    const trackId = data.replace('play_music_', '');
    return music.handlePlayMusic(ctx, trackId);
  }

  if (data === 'menu_games') {
    games.clearAllGames(userId);
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getGamesMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'game_stop_all') {
    games.clearAllGames(userId);
    await ctx.answerCbQuery('Game dihentikan.');
    const { text, inlineKeyboard } = userMenu.getGamesMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_tools') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getToolsMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_help') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getHelpMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'action_ping') {
    await ctx.answerCbQuery();
    return replyPingStatus(ctx);
  }

  // Submenu Tools
  if (data === 'tool_qrcode_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '📱 *Cara Buat QR Code:*\nKetik `/qr <teks atau link>`\nContoh: `/qr https://instagram.com`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_tts_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🗣️ *Cara Buat Voice Note (TTS):*\nKetik `/tts <teks>`\nContoh: `/tts Selamat pagi semuanya!`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_quote') {
    await ctx.answerCbQuery();
    const quote = tools.getRandomQuote();
    return renderMenu(ctx, `💡 *KATA BIJAK HARI INI*\n\n${quote}`, [
      [{ text: '🔄 Quote Lain', callback_data: 'tool_quote' }],
      [{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]
    ]);
  }

  if (data === 'tool_calc_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🧮 *Kalkulator Cepat:*\nKetik `/calc <ekspresi matematika>`\nContoh: `/calc (150 * 4) / 2`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  // Games Callback
  if (data === 'game_number_start') {
    await ctx.answerCbQuery();
    games.startNumberGame(userId);
    return renderMenu(
      ctx,
      '🔢 *GAME TEBAK ANGKA DIMULAI!*\n\n' +
      'Saya telah memilih sebuah angka rahasia antara *1 sampai 100*.\n' +
      'Ketik tebakanmu langsung di obrolan ini!\n\n' +
      `_(Sesi otomatis berakhir setelah ${games.GAME_TIMEOUT_MS / 60000} menit tidak aktif)_`,
      [[{ text: '🛑 Berhenti Main', callback_data: 'game_stop_all' }]]
    );
  }

  if (data === 'game_quiz_start') {
    await ctx.answerCbQuery();
    const quiz = games.getRandomRiddle(userId);
    return renderMenu(
      ctx,
      `🧩 *KUIS TEBAK-TEBAKAN*\n\n` +
      `❓ *Pertanyaan:*\n"${quiz.q}"\n\n` +
      `💡 *Petunjuk:* ${quiz.hint}\n\n` +
      `Ketik jawabanmu langsung di chat!`,
      [
        [{ text: '💡 Tebak-tebakan Lain', callback_data: 'game_quiz_start' }],
        [{ text: '🛑 Berhenti Main', callback_data: 'game_stop_all' }]
      ]
    );
  }

  if (data === 'game_word_start') {
    await ctx.answerCbQuery();
    const { scrambled, hint } = games.startWordGame(userId);
    return renderMenu(
      ctx,
      `🔤 *TEBAK KATA ACAK*\n\n` +
      `Susun ulang huruf berikut menjadi sebuah kata:\n\n` +
      `🔠 \`${scrambled.toUpperCase()}\`\n\n` +
      `💡 *Petunjuk:* ${hint}\n\n` +
      `Ketik jawabanmu langsung di chat!`,
      [
        [{ text: '🔄 Kata Lain', callback_data: 'game_word_start' }],
        [{ text: '🛑 Berhenti Main', callback_data: 'game_stop_all' }]
      ]
    );
  }

  if (data === 'game_math_start') {
    await ctx.answerCbQuery();
    const question = games.startMathGame(userId);
    return renderMenu(
      ctx,
      `🧮 *HITUNG CEPAT!*\n\n` +
      `Berapa hasil dari:\n\n` +
      `🔢 \`${question} = ?\`\n\n` +
      `Ketik jawabanmu secepat mungkin!`,
      [
        [{ text: '🔄 Soal Lain', callback_data: 'game_math_start' }],
        [{ text: '🛑 Berhenti Main', callback_data: 'game_stop_all' }]
      ]
    );
  }

  if (data === 'game_dice') {
    return playDiceDuel(ctx, '🎲', 'Lempar Dadu', 'game_dice');
  }

  if (data === 'game_sport_basket') {
    return playDiceDuel(ctx, '🏀', 'Basket', 'game_sport_basket');
  }

  if (data === 'game_sport_bola') {
    return playDiceDuel(ctx, '⚽', 'Sepak Bola', 'game_sport_bola');
  }

  if (data === 'game_sport_panah') {
    return playDiceDuel(ctx, '🎯', 'Lempar Panah', 'game_sport_panah');
  }

  if (data === 'game_sport_boling') {
    return playDiceDuel(ctx, '🎳', 'Boling', 'game_sport_boling');
  }

  if (data === 'game_slot') {
    await ctx.answerCbQuery('Memutar mesin slot!');
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
    try {
      await ctx.reply('🎰 *Mesin Slot Berputar...*', { parse_mode: 'Markdown' });
      const slot = await ctx.sendDice({ emoji: '🎰' });

      setTimeout(async () => {
        try {
          // Nilai 64 adalah Jackpot 777 di Telegram
          const isJackpot = slot.dice.value === 64;
          const text = isJackpot
            ? '🌟🎉 *JACKPOT 777! LUAR BIASA! KAMU MENANG BESAR!* 🎉🌟'
            : `Nilai spin: *${slot.dice.value}* / 64.\nBelum jackpot, coba putar sekali lagi yuk!`;

          db.incrementStat('total_games_played');
          await ctx.reply(text, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎰 Putar Lagi', callback_data: 'game_slot' }],
                [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
              ]
            }
          });
        } catch (err) {
          console.error('Slot result error:', err.message);
        }
      }, 3000);
    } catch (err) {
      console.error('Slot start error:', err.message);
    }
    return;
  }

  if (data === 'game_suit_menu') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getSuitMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data.startsWith('suit_')) {
    const choice = data.replace('suit_', '');
    const res = games.playSuit(choice);
    await ctx.answerCbQuery();
    db.incrementStat('total_games_played');

    let title = '🤝 HASIL SERI!';
    if (res.result === 'win') title = '🎉 KAMU MENANG!';
    if (res.result === 'lose') title = '😢 BOT MENANG!';

    return renderMenu(
      ctx,
      `✊✌️✋ *${title}*\n\n` +
      `Pilihan Kamu: *${res.userChoice}*\nPilihan Bot: *${res.botChoice}*`,
      [
        [{ text: '🔄 Main Lagi', callback_data: 'game_suit_menu' }],
        [{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]
      ]
    );
  }

  // ==========================================
  // CALLBACK ADMIN
  // ==========================================
  if (!db.isAdmin(userId)) {
    return ctx.answerCbQuery('⛔ Akses ditolak! Khusus Admin.', { show_alert: true });
  }

  if (data === 'menu_admin') {
    adminMenu.clearAdminSession(userId);
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = adminMenu.getAdminDashboard();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'admin_edit_banner') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_BANNER' });
    return renderMenu(
      ctx,
      '🖼️ *EDIT FOTO BANNER BOT*\n\n' +
      'Silakan *kirimkan foto baru* yang ingin Anda jadikan banner bot (sebagai Foto ataupun Dokumen).\n' +
      'Atau kirim teks URL gambar (misal: `https://example.com/banner.jpg`).\n\n' +
      '_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }

  if (data === 'admin_add_music') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_MUSIC' });
    return renderMenu(
      ctx,
      '🎶 *NAMBAHIN MUSIK DI BOT*\n\n' +
      'Silakan *kirim file audio MP3* langsung ke obrolan ini (boleh sebagai file Audio maupun Dokumen).\n' +
      'Atau kirim format teks:\n' +
      '`Judul Lagu | https://link-audio-langsung.mp3`\n\n' +
      '📏 *Batas ukuran file MP3:*\n' +
      '• Bot Telegram resmi (api.telegram.org) membatasi *upload dari bot* maksimal *50 MB* dan *download oleh bot* maksimal *20 MB*.\n' +
      '• File yang kamu kirim ke bot ini disimpan sebagai referensi (file_id), jadi umumnya tetap aman diproses walau lebih dari 20 MB. Tapi untuk jaga-jaga (agar bisa diputar lancar ke semua user), disarankan tetap *di bawah 50 MB*.\n\n' +
      '_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }

  if (data === 'admin_add_user') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_ADMIN' });
    return renderMenu(
      ctx,
      '👥 *TAMBAH ADMIN BARU*\n\n' +
      'Silakan kirimkan *Telegram User ID* pengguna yang ingin dijadikan admin.\n' +
      '_(User ID berupa angka, bisa didapatkan dari @userinfobot)_\n\n' +
      'Contoh: `123456789`\n\n' +
      '_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }

  if (data === 'admin_list') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = adminMenu.getAdminListMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'admin_manage_music') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = adminMenu.getMusicManageMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data.startsWith('admin_del_music_')) {
    const trackId = data.replace('admin_del_music_', '');
    db.deleteMusic(trackId);
    await ctx.answerCbQuery('Lagu berhasil dihapus!');
    const { text, inlineKeyboard } = adminMenu.getMusicManageMenu();
    return renderMenu(ctx, `🗑️ Lagu telah dihapus.\n\n${text}`, inlineKeyboard);
  }

  if (data === 'admin_broadcast') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_BROADCAST' });
    return renderMenu(
      ctx,
      '📢 *SIARAN PESAN (BROADCAST)*\n\n' +
      'Silakan ketik teks pengumuman yang akan dikirimkan ke SEMUA pengguna bot.\n\n' +
      '_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }
});

// ==========================================
// PENANGANAN INPUT AUDIO & FOTO DARI ADMIN
// ==========================================
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = adminMenu.getAdminSession(userId);

  // Jika admin sedang dalam sesi ganti banner
  if (db.isAdmin(userId) && session && session.action === 'WAITING_BANNER') {
    // Ambil photo resolusi tertinggi (elemen terakhir dari array photo)
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    db.setBanner(fileId, 'file_id');
    adminMenu.clearAdminSession(userId);

    await ctx.reply('✅ *SUKSES!* Foto banner bot berhasil diperbarui.', { parse_mode: 'Markdown' });
    // Tampilkan preview banner baru
    return sendUserMainMenu(ctx, false);
  }
});

// Batas resmi Telegram Bot API: upload oleh bot 50MB, download oleh bot 20MB
const BOT_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function saveMusicTrack(ctx, { title, artist, fileId, fileSize }) {
  const userId = ctx.from.id;
  const track = {
    id: `track_${Date.now()}`,
    title: title || 'Musik Baru',
    artist: artist || ctx.from.first_name || 'Admin',
    type: 'file_id',
    source: fileId,
    added_by: ctx.from.first_name,
    date: new Date().toISOString().split('T')[0]
  };

  db.addMusic(track);
  adminMenu.clearAdminSession(userId);

  const sizeText = formatFileSize(fileSize);
  const sizeWarning = fileSize && fileSize > BOT_UPLOAD_LIMIT_BYTES
    ? `\n\n⚠️ *Catatan:* Ukuran file ini *${sizeText}*, di atas batas upload resmi Bot API (*50 MB*). Referensinya tetap tersimpan, tapi kalau nanti gagal terkirim ke user, coba kompres file MP3-nya atau pakai link audio langsung.`
    : (sizeText ? `\n\n📏 Ukuran file: *${sizeText}*` : '');

  return ctx.reply(
    `✅ *MUSIK BERHASIL DITAMBAHKAN!*\n\n` +
    `🎶 *Judul:* ${track.title}\n` +
    `👤 *Artis:* ${track.artist}\n` +
    `💿 Musik sekarang sudah tersedia di Playlist untuk semua pengguna bot.${sizeWarning}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎵 Lihat Playlist Musik', callback_data: 'menu_music' }],
          [{ text: '👑 Kembali ke Admin', callback_data: 'menu_admin' }]
        ]
      }
    }
  );
}

bot.on('audio', async (ctx) => {
  const userId = ctx.from.id;
  const session = adminMenu.getAdminSession(userId);

  // Jika admin sedang dalam sesi nambah musik
  if (db.isAdmin(userId) && session && session.action === 'WAITING_MUSIC') {
    const audio = ctx.message.audio;
    return saveMusicTrack(ctx, {
      title: audio.title || audio.file_name,
      artist: audio.performer,
      fileId: audio.file_id,
      fileSize: audio.file_size
    });
  }
});

// ==========================================
// PENANGANAN FILE DIKIRIM SEBAGAI "DOKUMEN"
// (Banyak HP mengirim foto/mp3 sebagai Document, bukan Photo/Audio)
// ==========================================
bot.on('document', async (ctx) => {
  const userId = ctx.from.id;
  const session = adminMenu.getAdminSession(userId);
  if (!db.isAdmin(userId) || !session) return;

  const doc = ctx.message.document;
  const mime = doc.mime_type || '';
  const fileName = doc.file_name || '';

  if (session.action === 'WAITING_BANNER' && mime.startsWith('image/')) {
    db.setBanner(doc.file_id, 'file_id');
    adminMenu.clearAdminSession(userId);
    await ctx.reply('✅ *SUKSES!* Foto banner bot berhasil diperbarui.', { parse_mode: 'Markdown' });
    return sendUserMainMenu(ctx, false);
  }

  if (session.action === 'WAITING_MUSIC' && (mime.startsWith('audio/') || /\.mp3$/i.test(fileName))) {
    return saveMusicTrack(ctx, {
      title: fileName.replace(/\.mp3$/i, ''),
      artist: null,
      fileId: doc.file_id,
      fileSize: doc.file_size
    });
  }

  if (session.action === 'WAITING_MUSIC') {
    return ctx.reply('⚠️ Format file tidak dikenali sebagai audio. Harap kirim file MP3 yang valid.');
  }

  if (session.action === 'WAITING_BANNER') {
    return ctx.reply('⚠️ Format file tidak dikenali sebagai gambar. Harap kirim file foto (JPG/PNG) yang valid.');
  }
});

// ==========================================
// PENANGANAN TEKS (GAME, ADMIN SESSION, AUTO-URL)
// ==========================================
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();

  // 1. Sesi Admin
  const adminSession = adminMenu.getAdminSession(userId);
  if (db.isAdmin(userId) && adminSession) {
    if (adminSession.action === 'WAITING_BANNER') {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        db.setBanner(text, 'url');
        adminMenu.clearAdminSession(userId);
        await ctx.reply('✅ *SUKSES!* URL banner bot berhasil diperbarui.', { parse_mode: 'Markdown' });
        return sendUserMainMenu(ctx, false);
      } else {
        return ctx.reply('⚠️ Harap kirimkan foto langsung atau URL gambar yang valid (http/https).');
      }
    }

    if (adminSession.action === 'WAITING_MUSIC') {
      if (text.includes('|')) {
        const [title, url] = text.split('|').map(s => s.trim());
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          const track = {
            id: `track_${Date.now()}`,
            title: title || 'Lagu Baru',
            artist: ctx.from.first_name || 'Admin',
            type: 'url',
            source: url,
            added_by: ctx.from.first_name,
            date: new Date().toISOString().split('T')[0]
          };
          db.addMusic(track);
          adminMenu.clearAdminSession(userId);
          return ctx.reply(`✅ *Musik Berhasil Ditambahkan:* "${track.title}"`, { parse_mode: 'Markdown' });
        }
      }
      return ctx.reply('⚠️ Harap kirim file audio MP3 langsung atau format: `Judul Lagu | URL_MP3`');
    }

    if (adminSession.action === 'WAITING_ADMIN') {
      const targetId = text.trim();
      if (!targetId || isNaN(targetId)) {
        return ctx.reply('⚠️ Masukkan User ID Telegram yang valid (hanya angka). Contoh: `123456789`');
      }
      db.addAdmin(targetId);
      adminMenu.clearAdminSession(userId);
      return ctx.reply(
        `✅ *BERHASIL!* Pengguna dengan ID \`${targetId}\` sekarang telah menjadi Admin Bot.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '👑 Kembali ke Admin Panel', callback_data: 'menu_admin' }]]
          }
        }
      );
    }

    if (adminSession.action === 'WAITING_BROADCAST') {
      adminMenu.clearAdminSession(userId);
      const userList = db.getUserList();
      let sent = 0;
      let failed = 0;

      const notifyMsg = await ctx.reply(`📢 *Memulai Broadcast ke ${userList.length} pengguna...*`, { parse_mode: 'Markdown' });

      for (const u of userList) {
        try {
          await ctx.telegram.sendMessage(u.id, `📢 *PENGUMUMAN RESMI*\n\n${text}`, { parse_mode: 'Markdown' });
          sent++;
        } catch (err) {
          // Jika gagal karena format Markdown pengumuman tidak valid, coba kirim ulang sebagai teks polos
          try {
            await ctx.telegram.sendMessage(u.id, `📢 PENGUMUMAN RESMI\n\n${text}`);
            sent++;
          } catch {
            failed++;
          }
        }
      }

      await ctx.telegram.deleteMessage(ctx.chat.id, notifyMsg.message_id).catch(() => {});
      return ctx.reply(`✅ *Broadcast Selesai!*\n\n• Berhasil dikirim: *${sent} user*\n• Gagal (blokir/nonaktif): *${failed} user*`, { parse_mode: 'Markdown' });
    }
  }

  // 2. Active Guessing Games
  if (games.getNumberGame(userId)) {
    const guessRes = games.processNumberGuess(userId, text);
    if (guessRes) {
      if (guessRes.status === 'win') {
        db.incrementStat('total_games_played');
        return ctx.reply(guessRes.message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Main Lagi', callback_data: 'game_number_start' }],
              [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
            ]
          }
        });
      }
      return ctx.reply(guessRes.message, { parse_mode: 'Markdown' });
    }
  }

  if (games.getActiveRiddle(userId)) {
    const quizRes = games.answerRiddle(userId, text);
    if (quizRes) {
      if (quizRes.success) {
        db.incrementStat('total_games_played');
        return ctx.reply(
          `🎉 *BENAR SEKALI! JAWABANMU TEPAT!*\n\nJawabannya adalah: *${quizRes.answer}*`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🧩 Kuis Lainnya', callback_data: 'game_quiz_start' }],
                [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
              ]
            }
          }
        );
      } else {
        return ctx.reply(`❌ Jawaban belum tepat! Coba lagi.\n💡 Petunjuk: ${quizRes.hint}`);
      }
    }
  }

  if (games.getWordGame(userId)) {
    const wordRes = games.answerWordGame(userId, text);
    if (wordRes) {
      if (wordRes.success) {
        db.incrementStat('total_games_played');
        return ctx.reply(
          `🎉 *TEPAT SEKALI!*\n\nKata yang benar adalah: *${wordRes.word.toUpperCase()}*\n🔢 Percobaan: *${wordRes.attempts} kali*`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Kata Lain', callback_data: 'game_word_start' }],
                [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
              ]
            }
          }
        );
      } else {
        return ctx.reply(`❌ Belum tepat, coba lagi!\n💡 Petunjuk: ${wordRes.hint}`);
      }
    }
  }

  if (games.getMathGame(userId)) {
    const mathRes = games.answerMathGame(userId, text);
    if (mathRes) {
      if (mathRes.success) {
        db.incrementStat('total_games_played');
        return ctx.reply(
          `🎉 *BENAR!* Kamu menjawab dalam *${mathRes.elapsedSeconds} detik*.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Soal Lagi', callback_data: 'game_math_start' }],
                [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
              ]
            }
          }
        );
      } else {
        return ctx.reply(
          `❌ *Kurang tepat!* Jawaban yang benar adalah *${mathRes.correctAnswer}*.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Coba Soal Lain', callback_data: 'game_math_start' }],
                [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
              ]
            }
          }
        );
      }
    }
  }

  // 3. Auto-detect Video URL
  if (downloader.detectPlatform(text)) {
    return handleDownloadRequest(ctx, text);
  }

  // 4. Default Fallback untuk chat biasa
  if (text.startsWith('/')) {
    return ctx.reply('⚠️ Perintah tidak dikenali. Ketik /menu untuk melihat semua fitur bot.');
  }
});

// Penanganan Error Global Telegraf
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err.message);
});

// ==========================================
// STARTING BOT
// ==========================================
console.log('==============================================');
console.log('🤖 TELEGRAM BOT MULTIFUNGSI SIAP DINYALAKAN');
console.log(`📁 Lokasi: ${__dirname}`);
console.log(`👑 Owner ID: ${config.ownerId || 'Belum diatur'}`);
console.log('==============================================');

bot.telegram.getMe().then((me) => {
  console.log(`🚀 Terhubung sebagai @${me.username} (${me.first_name})`);
  console.log('Bot aktif dalam mode Long Polling (Siap menerima pesan).');
  return bot.launch();
}).catch((err) => {
  console.error('❌ Gagal menjalankan bot Telegram:', err.message);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
