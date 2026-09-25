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
const sholat = require('./features/sholat');

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

  if (ctx.callbackQuery) {
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
  }

  try {
    await ctx.replyWithPhoto(banner, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  } catch (err) {
    console.error('Error sendUserMainMenu:', err.message);
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }
}

async function renderMenu(ctx, text, inlineKeyboard) {
  try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
  return ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// ==========================================
// COMMANDS DASAR
// ==========================================
bot.command(['start', 'menu'], async (ctx) => {
  adminMenu.clearAdminSession(ctx.from.id);
  await sendUserMainMenu(ctx, false);
});

bot.command('help', async (ctx) => {
  const { text, inlineKeyboard } = userMenu.getHelpMenu();
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
});

bot.command('game', async (ctx) => {
  const { text, inlineKeyboard } = userMenu.getGamesMenu();
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
});

bot.command('musik', async (ctx) => {
  const { text, buttons } = music.formatMusicMenu();
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
});

// ==========================================
// FITUR: DOWNLOADER (/dl <url>)
// ==========================================
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

    const caption = 
`╭───「 ✅ *DOWNLOAD BERHASIL* 」
├ 📌 *Platform:* ${result.platform}
├ 📝 *Judul:* ${result.title || 'Video Media'}
` + (result.author ? `├ 👤 *Author:* ${result.author}\n` : '') +
`├ ⚡ *Status:* High Quality (No Watermark)
╰───────────────────────────`;

    if (result.videoUrl) {
      let targetVid = result.videoUrl;
      if (targetVid.startsWith('/')) {
        targetVid = 'https://www.tikwm.com' + targetVid;
      }

      let sent = false;
      // Metode 1: Stream bytes video langsung dari server VPS ke Telegram (user langsung dapat file video)
      try {
        const streamRes = await axios({
          method: 'get',
          url: targetVid,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': targetVid
          },
          timeout: 45000
        });
        await ctx.replyWithVideo({ source: streamRes.data }, { caption, parse_mode: 'Markdown' });
        sent = true;
      } catch (streamErr) {
        console.error('[Stream Video Error, coba URL langsung]:', streamErr.message);
      }

      // Metode 2: Coba via URL langsung
      if (!sent) {
        try {
          await ctx.replyWithVideo(targetVid, { caption, parse_mode: 'Markdown' });
          sent = true;
        } catch (urlErr) {
          console.error('[URL Video Error, coba kirim Document .mp4]:', urlErr.message);
        }
      }

      // Metode 3: Kirim sebagai dokumen video .mp4 (langsung bisa disimpan ke galeri oleh user)
      if (!sent) {
        try {
          const docRes = await axios({
            method: 'get',
            url: targetVid,
            responseType: 'stream',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 45000
          });
          const safeName = (result.title || 'video').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'video';
          await ctx.replyWithDocument(
            { source: docRes.data, filename: `${safeName}.mp4` },
            { caption, parse_mode: 'Markdown' }
          );
          sent = true;
        } catch (docErr) {
          console.error('[Document Stream Error]:', docErr.message);
        }
      }

      if (!sent) {
        await ctx.reply(`${caption}\n\n📥 *Link Download Langsung:*\n${targetVid}`, { parse_mode: 'Markdown' });
      }
    } else if (result.audioUrl) {
      let targetAud = result.audioUrl;
      if (targetAud.startsWith('/')) {
        targetAud = 'https://www.tikwm.com' + targetAud;
      }
      try {
        const streamAud = await axios({
          method: 'get',
          url: targetAud,
          responseType: 'stream',
          timeout: 30000
        });
        await ctx.replyWithAudio({ source: streamAud.data }, { caption, parse_mode: 'Markdown' });
      } catch (audErr) {
        await ctx.replyWithAudio(targetAud, { caption, parse_mode: 'Markdown' });
      }
    }

  } catch (error) {
    console.error('Download Handler Error:', error.message);
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`❌ *Error:* Gagal memproses media. Detail: ${error.message}`, { parse_mode: 'Markdown' });
  }
}

bot.command('dl', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/dl https://link-video.com`', { parse_mode: 'Markdown' });
  await handleDownloadRequest(ctx, args);
});

// ==========================================
// FITUR: SHORT URL (/short <url>)
// ==========================================
bot.command('short', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/short https://link-panjang-anda.com`', { parse_mode: 'Markdown' });

  const waitMsg = await ctx.reply('⏳ *Membuat shortlink...*', { parse_mode: 'Markdown' });
  try {
    const result = await shorturl.shortenUrl(args);
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    if (result.success) {
      db.incrementStat('total_shortlinks');
      const text = 
`╭───「 🎉 *SHORTLINK BERHASIL* 」
├ 🔗 *Short URL:* \`${result.shortUrl}\`
├ 🌐 *Layanan:* ${result.provider}
├ 📥 *Original:* ${args}
╰───────────────────────────
💡 _Ketuk tautan di atas untuk menyalin._`;
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
  if (!text) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/qr https://google.com` atau `/qr Teks Bebas`', { parse_mode: 'Markdown' });
  try {
    const qrBuffer = await tools.generateQrBuffer(text);
    await ctx.replyWithPhoto({ source: qrBuffer }, {
      caption: 
`╭───「 📱 *QR CODE GENERATOR* 」
├ 📄 *Data:* \`${text}\`
├ ⚡ *Status:* High Resolution
╰───────────────────────────
💡 _Scan kode menggunakan kamera smartphone._`,
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
  if (!text) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/tts Halo apa kabar kawan`', { parse_mode: 'Markdown' });
  try {
    const ttsUrl = tools.getTtsAudioUrl(text, 'id');
    await ctx.replyWithVoice({ url: ttsUrl }, {
      caption: 
`╭───「 🗣️ *VOICE NOTE GENERATOR* 」
├ 💬 *Teks:* "${text}"
├ 🌐 *Bahasa:* Indonesia (ID)
╰───────────────────────────`,
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
  if (!expr) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/calc 50 * 2 + 10`', { parse_mode: 'Markdown' });
  const result = tools.calculateMath(expr);
  if (result !== null) {
    await ctx.reply(
`╭───「 🧮 *HASIL PERHITUNGAN* 」
├ 🔢 *Soal:* \`${expr}\`
├ 🎯 *Hasil:* *${result}*
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Gagal menghitung. Pastikan rumus hanya berisi angka dan operator matematika valid (+, -, *, /, ^).');
  }
});

// ==========================================
// FITUR: CUACA (/cuaca <kota>)
// ==========================================
bot.command('cuaca', async (ctx) => {
  const city = ctx.message.text.split(' ').slice(1).join(' ').trim() || 'Jakarta';
  const waitMsg = await ctx.reply('🌤️ *Mengecek cuaca...*', { parse_mode: 'Markdown' });
  const w = await tools.getWeather(city);
  await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
  if (w.success) {
    await ctx.reply(
`╭───「 🌤️ *CUACA TERKINI* 」
├ 📍 *Lokasi:* ${w.city}, ${w.country}
├ 🌡️ *Suhu:* ${w.temp}°C (Terasa ${w.feelsLike}°C)
├ ☁️ *Kondisi:* ${w.desc}
├ 💧 *Kelembaban:* ${w.humidity}%
├ 💨 *Angin:* ${w.wind} km/h (${w.windDir})
├ 👁️ *Visibilitas:* ${w.visibility} km
├ ☀️ *UV Index:* ${w.uvIndex}
├ ☁️ *Awan:* ${w.cloudCover}%
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Gagal mendapatkan cuaca: ${w.error}`);
  }
});

// ==========================================
// FITUR: TRANSLATE (/translate <teks>)
// ==========================================
bot.command('translate', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) return ctx.reply('⚠️ *Format:*\n`/translate <teks>` ➔ ID ke EN\n`/translate en|id <teks>` ➔ EN ke ID', { parse_mode: 'Markdown' });
  
  let fromLang = 'id', toLang = 'en', query = text;
  if (text.includes('|')) {
    const parts = text.split('|');
    if (parts.length >= 2 && parts[0].trim().length <= 5) {
      const langs = parts[0].trim().split(/[\s>-]+/);
      if (langs.length >= 2) { fromLang = langs[0]; toLang = langs[1]; }
      query = parts.slice(1).join('|').trim();
    }
  }
  
  const waitMsg = await ctx.reply('🌐 *Menerjemahkan...*', { parse_mode: 'Markdown' });
  const result = await tools.translateText(query, fromLang, toLang);
  await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
  
  if (result.success) {
    await ctx.reply(
`╭───「 🌐 *HASIL TERJEMAHAN* 」
├ 🔤 *Dari:* ${result.from.toUpperCase()} ➔ ${result.to.toUpperCase()}
├ 📝 *Asli:* "${query}"
├ ✅ *Hasil:* "${result.translated}"
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Gagal menerjemahkan: ${result.error}`);
  }
});

// ==========================================
// FITUR: WIKIPEDIA (/wiki <topik>)
// ==========================================
bot.command('wiki', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!query) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/wiki Indonesia`', { parse_mode: 'Markdown' });
  
  const waitMsg = await ctx.reply('📚 *Mencari di Wikipedia...*', { parse_mode: 'Markdown' });
  const result = await tools.searchWikipedia(query);
  await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
  
  if (result.success) {
    let msg = 
`╭───「 📚 *WIKIPEDIA* 」
├ 📖 *${result.title}*
╰───────────────────────────

${result.extract}`;
    if (result.url) msg += `\n\n🔗 [Baca selengkapnya](${result.url})`;
    await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
});

// ==========================================
// FITUR: KURS MATA UANG (/kurs <jumlah> <dari> <ke>)
// ==========================================
bot.command('kurs', async (ctx) => {
  const parts = ctx.message.text.split(' ').slice(1);
  if (parts.length < 3) return ctx.reply('⚠️ *Format:* `/kurs 100 USD IDR`', { parse_mode: 'Markdown' });
  
  const amount = parseFloat(parts[0]);
  const from = parts[1];
  const to = parts[2];
  if (isNaN(amount)) return ctx.reply('⚠️ Jumlah harus berupa angka!');
  
  const waitMsg = await ctx.reply('💱 *Mengkonversi...*', { parse_mode: 'Markdown' });
  const result = await tools.convertCurrency(amount, from, to);
  await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
  
  if (result.success) {
    await ctx.reply(
`╭───「 💱 *KONVERSI MATA UANG* 」
├ 💰 *${result.amount} ${result.from}* = *${result.result} ${result.to}*
├ 📊 *Rate:* 1 ${result.from} = ${result.rate} ${result.to}
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Gagal konversi: ${result.error}`);
  }
});

// ==========================================
// FITUR: IP LOOKUP (/ip <address>)
// ==========================================
bot.command('ip', async (ctx) => {
  const ip = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!ip) return ctx.reply('⚠️ *Format:* `/ip 8.8.8.8`', { parse_mode: 'Markdown' });
  
  const result = await tools.ipLookup(ip);
  if (result.success) {
    const d = result.data;
    await ctx.reply(
`╭───「 🌍 *IP ADDRESS LOOKUP* 」
├ 🔍 *IP:* \`${d.query}\`
├ 🌏 *Negara:* ${d.country}
├ 🏙️ *Region:* ${d.regionName}
├ 📍 *Kota:* ${d.city}
├ 📮 *Zip:* ${d.zip}
├ 📡 *ISP:* ${d.isp}
├ 🏢 *Org:* ${d.org}
├ 🕐 *Timezone:* ${d.timezone}
├ 📐 *Koordinat:* ${d.lat}, ${d.lon}
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Gagal: ${result.error}`);
  }
});

// ==========================================
// FITUR: MAGIC 8-BALL (/8ball <pertanyaan>)
// ==========================================
bot.command('8ball', async (ctx) => {
  const question = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!question) return ctx.reply('⚠️ *Format:* `/8ball Apakah aku akan sukses?`', { parse_mode: 'Markdown' });
  const answer = games.magic8Ball();
  await ctx.reply(
`╭───「 🔮 *MAGIC 8-BALL* 」
├ ❓ *Pertanyaan:* "${question}"
├ 🎱 *Jawaban:* ${answer.text}
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

// ==========================================
// FITUR: UMUR (/umur <YYYY-MM-DD>)
// ==========================================
bot.command('umur', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('⚠️ *Format:* `/umur 2000-05-15`', { parse_mode: 'Markdown' });
  const age = tools.calculateAge(input);
  if (!age) return ctx.reply('❌ Format tanggal salah! Gunakan: YYYY-MM-DD');
  await ctx.reply(
`╭───「 🎂 *KALKULATOR UMUR* 」
├ 📅 *Tanggal Lahir:* ${input}
├ 🎉 *Umur:* ${age.years} tahun, ${age.months} bulan, ${age.days} hari
├ 📊 *Total:* ${age.totalDays.toLocaleString()} hari
├ 📆 *Total:* ${age.totalWeeks.toLocaleString()} minggu
├ 🗓️ *Total:* ${age.totalMonths} bulan
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

// ==========================================
// FITUR: BMI (/bmi <berat> <tinggi>)
// ==========================================
bot.command('bmi', async (ctx) => {
  const parts = ctx.message.text.split(' ').slice(1);
  if (parts.length < 2) return ctx.reply('⚠️ *Format:* `/bmi 65 170` (berat kg, tinggi cm)', { parse_mode: 'Markdown' });
  const weight = parseFloat(parts[0]);
  const height = parseFloat(parts[1]);
  if (isNaN(weight) || isNaN(height)) return ctx.reply('❌ Masukkan angka yang valid!');
  const result = tools.calculateBMI(weight, height);
  await ctx.reply(
`╭───「 ⚖️ *BMI CALCULATOR* 」
├ 🏋️ *Berat:* ${result.weight} kg
├ 📏 *Tinggi:* ${result.height} cm
├ 📊 *BMI:* ${result.bmi}
├ ${result.emoji} *Kategori:* ${result.category}
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

// ==========================================
// FITUR: FANCY TEXT (/fancy <teks>)
// ==========================================
bot.command('fancy', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) return ctx.reply('⚠️ *Format:* `/fancy Hello World`', { parse_mode: 'Markdown' });
  const styles = tools.toFancyText(text);
  await ctx.reply(
`╭───「 ✍️ *FANCY TEXT GENERATOR* 」
├ 📝 *Original:* ${text}
╰───────────────────────────

𝐁𝐨𝐥𝐝: ${styles.bold}
𝑰𝒕𝒂𝒍𝒊𝒄: ${styles.italic}
𝙼𝚘𝚗𝚘: ${styles.monospace}
Ⓒⓘⓡⓒⓛⓔ: ${styles.circled}

💡 _Salin teks di atas untuk digunakan._`);
});

// ==========================================
// FITUR: JADWAL SHOLAT (/sholat)
// ==========================================
bot.command('sholat', async (ctx) => {
  const waitMsg = await ctx.reply('🕌 *Mengambil jadwal sholat...*', { parse_mode: 'Markdown' });
  const times = await sholat.getPrayerTimesDisplay();
  await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
  
  if (times) {
    await ctx.reply(
`╭───「 🕌 *JADWAL SHOLAT HARI INI* 」
├ 📍 *Wilayah:* Jabodetabek (WIB)
├ 📅 *Tanggal:* ${times.date}
╰───────────────────────────

╭───「 ⏰ *WAKTU SHOLAT* 」
├ 🌅 *Subuh:*    \`${times.subuh} WIB\`
├ ☀️ *Terbit:*    \`${times.sunrise} WIB\`
├ ☀️ *Dzuhur:*   \`${times.dzuhur} WIB\`
├ 🌇 *Ashar:*    \`${times.ashar} WIB\`
├ 🌆 *Maghrib:*  \`${times.maghrib} WIB\`
├ 🌙 *Isya:*     \`${times.isya} WIB\`
╰───────────────────────────

🤲 _Jangan lupa sholat tepat waktu!_`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Gagal mengambil jadwal sholat. Coba lagi nanti.');
  }
});

// ==========================================
// FITUR: PING & SERVER STATUS (/ping)
// ==========================================
async function replyPingStatus(ctx) {
  if (ctx.callbackQuery) {
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
  }
  const start = Date.now();
  const pingMsg = await ctx.reply('📡 *Mengukur latensi server...*', { parse_mode: 'Markdown' });
  const latency = Date.now() - start;

  const specs = tools.getServerSpecs(botStartTime);
  const users = db.getUserList();
  const admins = db.getAdmins();

  const text = 
`╭───「 ⚡ *STATUS SERVER & HOSTING* 」
├ 📶 *Latensi Bot:* \`${latency} ms\`
├ ⏱️ *Bot Uptime:* \`${specs.uptime}\`
├ 🖥️ *Sistem Operasi:* \`${specs.os}\`
├ 🧠 *RAM Terpakai:* \`${specs.ram}\`
├ ⚙️ *CPU:* \`${specs.cpu} (${specs.cpuCores} Cores)\`
├ 🟢 *Node.js:* \`${specs.nodeVersion}\`
├ 👥 *Total Pengguna:* \`${users.length} user\`
├ 🛡️ *Total Admin:* \`${admins.length} admin\`
╰───────────────────────────`;

  await ctx.telegram.editMessageText(ctx.chat.id, pingMsg.message_id, undefined, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]]
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
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
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
  if (!targetId) return ctx.reply('⚠️ *Format salah!*\nGunakan: `/deladmin <Telegram_User_ID>`', { parse_mode: 'Markdown' });
  if (targetId === String(config.ownerId)) return ctx.reply('⛔ Tidak dapat menghapus Super Owner dari daftar admin!');
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

  // ── Navigasi Menu User ──
  if (data === 'menu_main') {
    adminMenu.clearAdminSession(userId);
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
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getGamesMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_tools') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getToolsMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'menu_fun') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getFunMenu();
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

  // ── Tools Callbacks ──
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

  if (data === 'tool_weather_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🌤️ *Cek Cuaca Terkini:*\nKetik `/cuaca <nama kota>`\nContoh: `/cuaca Jakarta`\nContoh: `/cuaca Bandung`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_translate_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🌐 *Translator:*\n`/translate <teks>` ➔ ID ke EN\n`/translate en id|<teks>` ➔ EN ke ID\n\nContoh:\n`/translate Selamat pagi`\n`/translate en id|Good morning`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_wiki_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '📚 *Wikipedia Search:*\nKetik `/wiki <topik>`\nContoh: `/wiki Indonesia`\nContoh: `/wiki Albert Einstein`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_currency_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '💱 *Konversi Mata Uang:*\nKetik `/kurs <jumlah> <dari> <ke>`\nContoh: `/kurs 100 USD IDR`\nContoh: `/kurs 1000000 IDR USD`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_password') {
    await ctx.answerCbQuery();
    const pw8 = tools.generatePassword(8);
    const pw12 = tools.generatePassword(12);
    const pw16 = tools.generatePassword(16);
    const pw24 = tools.generatePassword(24);
    return renderMenu(ctx,
`╭───「 🔐 *PASSWORD GENERATOR* 」
├ 8 karakter:  \`${pw8}\`
├ 12 karakter: \`${pw12}\`
├ 16 karakter: \`${pw16}\`
├ 24 karakter: \`${pw24}\`
╰───────────────────────────
💡 _Ketuk password untuk menyalin._`, [
      [{ text: '🔄 Generate Ulang', callback_data: 'tool_password' }],
      [{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]
    ]);
  }

  if (data === 'tool_base64_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🔄 *Base64 Encode/Decode:*\n`/encode <teks>` ➔ Encode ke Base64\n`/decode <base64>` ➔ Decode dari Base64\n\nContoh: `/encode Hello World`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_ip_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🌍 *IP Address Lookup:*\nKetik `/ip <alamat IP>`\nContoh: `/ip 8.8.8.8`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_color') {
    await ctx.answerCbQuery();
    const color = tools.getRandomColor();
    return renderMenu(ctx,
`╭───「 🎨 *RANDOM COLOR* 」
├ 🔵 *HEX:* \`${color.hex}\`
├ 🟢 *RGB:* \`${color.rgb}\`
├ 🔴 R: ${color.r} | G: ${color.g} | B: ${color.b}
╰───────────────────────────`, [
      [{ text: '🔄 Warna Lain', callback_data: 'tool_color' }],
      [{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]
    ]);
  }

  if (data === 'tool_fancy_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '✍️ *Fancy Text Generator:*\nKetik `/fancy <teks>`\nContoh: `/fancy Hello World`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_wc_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '📊 *Word Counter:*\nKetik `/wc <teks>`\nContoh: `/wc Halo dunia ini adalah teks contoh`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_age_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🎂 *Kalkulator Umur:*\nKetik `/umur <YYYY-MM-DD>`\nContoh: `/umur 2000-05-15`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_bmi_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '⚖️ *BMI Calculator:*\nKetik `/bmi <berat_kg> <tinggi_cm>`\nContoh: `/bmi 65 170`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_roman_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '🏛️ *Konversi Angka Romawi:*\nKetik `/romawi <angka>`\nContoh: `/romawi 2024`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  if (data === 'tool_countdown_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx, '⏳ *Countdown Timer:*\nKetik `/countdown <YYYY-MM-DD>`\nContoh: `/countdown 2025-01-01`', [[{ text: '🔙 Kembali ke Tools', callback_data: 'menu_tools' }]]);
  }

  // ── Sholat ──
  if (data === 'tool_sholat') {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
    const times = await sholat.getPrayerTimesDisplay();
    if (times) {
      return ctx.reply(
`╭───「 🕌 *JADWAL SHOLAT HARI INI* 」
├ 📍 *Wilayah:* Jabodetabek (WIB)
├ 📅 *Tanggal:* ${times.date}
╰───────────────────────────

╭───「 ⏰ *WAKTU SHOLAT* 」
├ 🌅 *Subuh:*    \`${times.subuh} WIB\`
├ ☀️ *Terbit:*    \`${times.sunrise} WIB\`
├ ☀️ *Dzuhur:*   \`${times.dzuhur} WIB\`
├ 🌇 *Ashar:*    \`${times.ashar} WIB\`
├ 🌆 *Maghrib:*  \`${times.maghrib} WIB\`
├ 🌙 *Isya:*     \`${times.isya} WIB\`
╰───────────────────────────

🤲 _Jangan lupa sholat tepat waktu!_`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]]
        }
      });
    } else {
      return ctx.reply('❌ Gagal mengambil jadwal sholat.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_main' }]] }
      });
    }
  }

  // ── Games Callbacks ──
  if (data === 'game_number_start') {
    await ctx.answerCbQuery();
    games.startNumberGame(userId);
    return renderMenu(ctx,
      '🔢 *GAME TEBAK ANGKA DIMULAI!*\n\n' +
      'Saya telah memilih sebuah angka rahasia antara *1 sampai 100*.\n' +
      'Ketik tebakanmu langsung di obrolan ini!\n\n' +
      '_(Ketik /menu untuk berhenti main)_',
      [[{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]]
    );
  }

  if (data === 'game_quiz_start') {
    await ctx.answerCbQuery();
    const quiz = games.getRandomRiddle(userId);
    return renderMenu(ctx,
      `🧩 *KUIS TEBAK-TEBAKAN*\n\n❓ *Pertanyaan:*\n"${quiz.q}"\n\n💡 *Petunjuk:* ${quiz.hint}\n\nKetik jawabanmu langsung di chat!`,
      [
        [{ text: '💡 Tebak-tebakan Lain', callback_data: 'game_quiz_start' }],
        [{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]
      ]
    );
  }

  if (data === 'game_trivia_start') {
    await ctx.answerCbQuery();
    const trivia = games.getRandomTrivia(userId);
    return renderMenu(ctx,
`╭───「 🎯 *TRIVIA QUIZ* 」
├ 📂 *Kategori:* ${trivia.category}
╰───────────────────────────

❓ *Pertanyaan:*
"${trivia.q}"

💡 *Petunjuk:* ${trivia.hint}

📝 Ketik jawabanmu langsung di chat!`,
      [
        [{ text: '⏭️ Skip / Trivia Lain', callback_data: 'game_trivia_start' }],
        [{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]
      ]
    );
  }

  if (data === 'game_emoji_start') {
    await ctx.answerCbQuery();
    const puzzle = games.getRandomEmojiPuzzle(userId);
    return renderMenu(ctx,
`╭───「 😜 *EMOJI PUZZLE* 」
├ 🎯 Tebak kata dari emoji berikut:
╰───────────────────────────

${puzzle.emoji}

💡 *Petunjuk:* ${puzzle.hint}

📝 Ketik jawabanmu langsung di chat!`,
      [
        [{ text: '⏭️ Skip / Puzzle Lain', callback_data: 'game_emoji_start' }],
        [{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]
      ]
    );
  }

  if (data === 'game_dice') {
    await ctx.answerCbQuery('Melempar dadu...');
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
    await ctx.reply('🎲 *Kamu melempar dadu:*', { parse_mode: 'Markdown' });
    const userDice = await ctx.sendDice({ emoji: '🎲' });
    setTimeout(async () => {
      await ctx.reply('🤖 *Giliran Bot melempar dadu:*', { parse_mode: 'Markdown' });
      const botDice = await ctx.sendDice({ emoji: '🎲' });
      setTimeout(async () => {
        const uVal = userDice.dice.value;
        const bVal = botDice.dice.value;
        let outcome = '🤝 Seri! Kita sama kuat.';
        if (uVal > bVal) outcome = '🎉 Kamu MENANG! Dadu kamu lebih tinggi!';
        if (bVal > uVal) outcome = '🤖 Bot MENANG! Coba lempar lagi.';
        await ctx.reply(`🎯 *Hasil Pertandingan Dadu:*\n\nKamu: *${uVal}* 🎲\nBot: *${bVal}* 🎲\n\n${outcome}`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🔄 Lempar Lagi', callback_data: 'game_dice' }],
            [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
          ]}
        });
      }, 3000);
    }, 2500);
    return;
  }

  if (data === 'game_slot') {
    await ctx.answerCbQuery('Memutar mesin slot!');
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
    await ctx.reply('🎰 *Mesin Slot Berputar...*', { parse_mode: 'Markdown' });
    const slot = await ctx.sendDice({ emoji: '🎰' });
    setTimeout(async () => {
      const isJackpot = slot.dice.value === 64;
      const text = isJackpot
        ? '🌟🎉 *JACKPOT 777! LUAR BIASA! KAMU MENANG BESAR!* 🎉🌟'
        : `Nilai spin: *${slot.dice.value}* / 64.\nBelum jackpot, coba putar sekali lagi yuk!`;
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '🎰 Putar Lagi', callback_data: 'game_slot' }],
          [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
        ]}
      });
    }, 3000);
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
    let title = '🤝 HASIL SERI!';
    if (res.result === 'win') title = '🎉 KAMU MENANG!';
    if (res.result === 'lose') title = '😢 BOT MENANG!';
    return renderMenu(ctx,
      `✊✌️✋ *${title}*\n\nPilihan Kamu: *${res.userChoice}*\nPilihan Bot: *${res.botChoice}*`,
      [
        [{ text: '🔄 Main Lagi', callback_data: 'game_suit_menu' }],
        [{ text: '🔙 Kembali ke Game Zone', callback_data: 'menu_games' }]
      ]
    );
  }

  // ── Coin Flip ──
  if (data === 'game_coinflip') {
    await ctx.answerCbQuery('Melempar koin...');
    const coin = games.flipCoin();
    return renderMenu(ctx,
`╭───「 🪙 *COIN FLIP* 」
├ ${coin.emoji} Hasil: *${coin.indo}*
╰───────────────────────────`, [
      [{ text: '🔄 Lempar Lagi', callback_data: 'game_coinflip' }],
      [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
    ]);
  }

  // ── Magic 8-Ball ──
  if (data === 'game_8ball_help') {
    await ctx.answerCbQuery();
    return renderMenu(ctx,
`╭───「 🔮 *MAGIC 8-BALL* 」
├ ❓ Tanyakan apapun kepada bola ajaib!
├ 📝 Ketik: \`/8ball <pertanyaan>\`
├ Contoh: \`/8ball Apakah aku akan sukses?\`
╰───────────────────────────`, [[{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]]);
  }

  // ── Math Challenge ──
  if (data === 'game_math_start') {
    await ctx.answerCbQuery();
    const challenge = games.startMathChallenge(userId);
    return renderMenu(ctx,
`╭───「 🧮 *MATH CHALLENGE!* 」
├ ⚡ Jawab secepat mungkin!
╰───────────────────────────

❓ Berapakah hasil dari:

*${challenge.problem} = ?*

📝 Ketik jawabanmu langsung di chat!
⏱️ _Waktu dimulai sekarang!_`, [
      [{ text: '⏭️ Skip', callback_data: 'game_math_start' }],
      [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
    ]);
  }

  // ── Word Game (Hangman) ──
  if (data === 'game_word_start') {
    await ctx.answerCbQuery();
    const game = games.startWordGame(userId);
    const display = games.getWordDisplay(game);
    const hearts = '❤️'.repeat(game.maxWrong);
    return renderMenu(ctx,
`╭───「 📝 *TEBAK KATA* 」
├ 🎯 Tebak huruf satu per satu!
╰───────────────────────────

📝 ${display}
${hearts} (${game.maxWrong} nyawa)

💡 *Petunjuk:* ${game.hint}

📝 Ketik *satu huruf* di chat! (A-Z)`, [
      [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
    ]);
  }

  // ── Lucky Number ──
  if (data === 'game_lucky') {
    await ctx.answerCbQuery();
    const lucky = games.getLuckyNumber();
    return renderMenu(ctx,
`╭───「 🍀 *ANGKA KEBERUNTUNGAN* 」
├ 🎰 *Angka Lucky-mu:* *${lucky.number}* / 100
├ ${lucky.meaning}
╰───────────────────────────`, [
      [{ text: '🔄 Coba Lagi', callback_data: 'game_lucky' }],
      [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
    ]);
  }

  // ── Truth or Dare ──
  if (data === 'game_tod_menu') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getTodMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data === 'game_truth') {
    await ctx.answerCbQuery();
    const truth = games.getRandomTruth();
    return renderMenu(ctx,
`╭───「 💬 *TRUTH* 」
├ 🔥 Jawab dengan JUJUR:
╰───────────────────────────

"${truth}"`, [
      [{ text: '💬 Truth Lain', callback_data: 'game_truth' }],
      [{ text: '⚡ Ganti ke Dare', callback_data: 'game_dare' }],
      [{ text: '🔙 Kembali', callback_data: 'game_tod_menu' }]
    ]);
  }

  if (data === 'game_dare') {
    await ctx.answerCbQuery();
    const dare = games.getRandomDare();
    return renderMenu(ctx,
`╭───「 ⚡ *DARE* 」
├ 🔥 Lakukan tantangan ini:
╰───────────────────────────

"${dare}"`, [
      [{ text: '⚡ Dare Lain', callback_data: 'game_dare' }],
      [{ text: '💬 Ganti ke Truth', callback_data: 'game_truth' }],
      [{ text: '🔙 Kembali', callback_data: 'game_tod_menu' }]
    ]);
  }

  // ── Would You Rather ──
  if (data === 'game_wyr') {
    await ctx.answerCbQuery();
    const wyr = games.getRandomWouldYouRather();
    return renderMenu(ctx,
`╭───「 🤔 *WOULD YOU RATHER* 」
├ Pilih salah satu:
╰───────────────────────────

🅰️ ${wyr.a}

     *ATAU*

🅱️ ${wyr.b}

🤔 _Mana yang kamu pilih?_`, [
      [{ text: '🔄 Pertanyaan Lain', callback_data: 'game_wyr' }],
      [{ text: '🔙 Kembali ke Game', callback_data: 'menu_games' }]
    ]);
  }

  // ── Fun Zone Callbacks ──
  if (data === 'fun_joke') {
    await ctx.answerCbQuery();
    const joke = tools.getRandomJoke();
    return renderMenu(ctx,
`╭───「 😂 *JOKES LUCU* 」
╰───────────────────────────

❓ *${joke.q}*

💬 ${joke.a}`, [
      [{ text: '😂 Joke Lain', callback_data: 'fun_joke' }],
      [{ text: '🔙 Kembali', callback_data: 'menu_fun' }]
    ]);
  }

  if (data === 'fun_fact') {
    await ctx.answerCbQuery();
    const fact = tools.getRandomFact();
    return renderMenu(ctx,
`╭───「 🧠 *FAKTA UNIK* 」
╰───────────────────────────

${fact}`, [
      [{ text: '🧠 Fakta Lain', callback_data: 'fun_fact' }],
      [{ text: '🔙 Kembali', callback_data: 'menu_fun' }]
    ]);
  }

  if (data === 'fun_dog' || data === 'fun_cat') {
    await ctx.answerCbQuery('Mencari foto...');
    try { await ctx.deleteMessage().catch(() => {}); } catch (e) {}
    const type = data === 'fun_dog' ? 'shibes' : 'cats';
    const label = data === 'fun_dog' ? '🐕 Anjing' : '🐱 Kucing';
    const result = await tools.getRandomAnimalImage(type);
    if (result.success) {
      try {
        await ctx.replyWithPhoto(result.url, {
          caption: `${label} Random! 🥰`,
          reply_markup: { inline_keyboard: [
            [{ text: `🔄 ${label} Lain`, callback_data: data }],
            [{ text: '🔙 Kembali', callback_data: 'menu_fun' }]
          ]}
        });
      } catch {
        await ctx.reply(`❌ Gagal menampilkan foto. Coba lagi!`, {
          reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_fun' }]] }
        });
      }
    } else {
      await ctx.reply(`❌ ${result.error}`, {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'menu_fun' }]] }
      });
    }
    return;
  }

  // ── Zodiac ──
  if (data === 'fun_zodiac_menu') {
    await ctx.answerCbQuery();
    const { text, inlineKeyboard } = userMenu.getZodiacMenu();
    return renderMenu(ctx, text, inlineKeyboard);
  }

  if (data.startsWith('zodiac_')) {
    const zodiac = data.replace('zodiac_', '');
    await ctx.answerCbQuery();
    const h = games.getHoroscope(zodiac);
    if (h) {
      const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(5 - n);
      return renderMenu(ctx,
`╭───「 ${h.emoji} *RAMALAN ${h.name.toUpperCase()}* 」
├ 📅 *Periode:* ${h.period}
╰───────────────────────────

🔮 *Ramalan Hari Ini:*
${h.fortune}

╭───「 📊 *RATING* 」
├ 💕 Cinta: ${stars(h.love)}
├ 💼 Karir: ${stars(h.career)}
├ 🏥 Kesehatan: ${stars(h.health)}
├ 🍀 Keberuntungan: *${h.luck}%*
╰───────────────────────────`, [
        [{ text: '🔄 Refresh', callback_data: data }],
        [{ text: '🔙 Pilih Zodiak Lain', callback_data: 'fun_zodiac_menu' }],
        [{ text: '🔙 Kembali ke Fun', callback_data: 'menu_fun' }]
      ]);
    }
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
    return renderMenu(ctx,
      '🖼️ *EDIT FOTO BANNER BOT*\n\nSilakan *kirimkan foto baru* yang ingin Anda jadikan banner bot.\nAtau kirim teks URL gambar (misal: `https://example.com/banner.jpg`).\n\n_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }

  if (data === 'admin_add_music') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_MUSIC' });
    return renderMenu(ctx,
      '🎶 *NAMBAHIN MUSIK DI BOT*\n\nSilakan *kirim file audio MP3* langsung ke obrolan ini.\nAtau kirim format teks:\n`Judul Lagu | https://link-audio-langsung.mp3`\n\n_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }

  if (data === 'admin_add_user') {
    await ctx.answerCbQuery();
    adminMenu.setAdminSession(userId, { action: 'WAITING_ADMIN' });
    return renderMenu(ctx,
      '👥 *TAMBAH ADMIN BARU*\n\nSilakan kirimkan *Telegram User ID* pengguna yang ingin dijadikan admin.\n_(User ID berupa angka, bisa didapatkan dari @userinfobot)_\n\nContoh: `123456789`\n\n_Ketik /admin untuk membatalkan._',
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
    return renderMenu(ctx,
      '📢 *SIARAN PESAN (BROADCAST)*\n\nSilakan ketik teks pengumuman yang akan dikirimkan ke SEMUA pengguna bot.\n\n_Ketik /admin untuk membatalkan._',
      [[{ text: '🔙 Batal / Kembali ke Admin', callback_data: 'menu_admin' }]]
    );
  }
});

// ==========================================
// ADDITIONAL COMMANDS (Base64, Word Count, Roman, Countdown)
// ==========================================
bot.command('encode', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) return ctx.reply('⚠️ *Format:* `/encode <teks>`', { parse_mode: 'Markdown' });
  const encoded = tools.base64Encode(text);
  await ctx.reply(
`╭───「 🔄 *BASE64 ENCODE* 」
├ 📝 *Input:* "${text}"
├ ✅ *Output:* \`${encoded}\`
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

bot.command('decode', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) return ctx.reply('⚠️ *Format:* `/decode <base64>`', { parse_mode: 'Markdown' });
  const decoded = tools.base64Decode(text);
  if (decoded !== null) {
    await ctx.reply(
`╭───「 🔄 *BASE64 DECODE* 」
├ 📝 *Input:* \`${text}\`
├ ✅ *Output:* "${decoded}"
╰───────────────────────────`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('❌ Gagal decode. Pastikan input adalah Base64 yang valid.');
  }
});

bot.command('wc', async (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!text) return ctx.reply('⚠️ *Format:* `/wc <teks>`', { parse_mode: 'Markdown' });
  const count = tools.countText(text);
  await ctx.reply(
`╭───「 📊 *WORD COUNTER* 」
├ 📝 *Karakter:* ${count.chars}
├ 🔤 *Karakter (tanpa spasi):* ${count.charsNoSpace}
├ 📖 *Kata:* ${count.words}
├ 📄 *Kalimat:* ${count.sentences}
├ 📃 *Baris:* ${count.lines}
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

bot.command('romawi', async (ctx) => {
  const num = parseInt(ctx.message.text.split(' ').slice(1).join(' ').trim(), 10);
  if (isNaN(num) || num < 1 || num > 3999) return ctx.reply('⚠️ *Format:* `/romawi <angka 1-3999>`', { parse_mode: 'Markdown' });
  const roman = tools.toRoman(num);
  await ctx.reply(
`╭───「 🏛️ *ANGKA ROMAWI* 」
├ 🔢 *Angka:* ${num}
├ 🏛️ *Romawi:* *${roman}*
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

bot.command('countdown', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('⚠️ *Format:* `/countdown 2025-01-01`', { parse_mode: 'Markdown' });
  const cd = tools.getCountdown(input);
  if (!cd) return ctx.reply('❌ Format tanggal salah! Gunakan: YYYY-MM-DD');
  if (cd.expired) return ctx.reply('⏰ Tanggal tersebut sudah lewat!');
  await ctx.reply(
`╭───「 ⏳ *COUNTDOWN* 」
├ 🎯 *Target:* ${input}
├ ⏰ *Sisa Waktu:*
├ 📅 *${cd.days}* hari
├ ⏰ *${cd.hours}* jam
├ ⏱️ *${cd.minutes}* menit
├ ⏲️ *${cd.seconds}* detik
╰───────────────────────────`, { parse_mode: 'Markdown' });
});

// ==========================================
// PENANGANAN INPUT AUDIO & FOTO DARI ADMIN
// ==========================================
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = adminMenu.getAdminSession(userId);

  if (db.isAdmin(userId) && session && session.action === 'WAITING_BANNER') {
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    db.setBanner(fileId, 'file_id');
    adminMenu.clearAdminSession(userId);
    await ctx.reply('✅ *SUKSES!* Foto banner bot berhasil diperbarui.', { parse_mode: 'Markdown' });
    return sendUserMainMenu(ctx, false);
  }
});

bot.on('audio', async (ctx) => {
  const userId = ctx.from.id;
  const session = adminMenu.getAdminSession(userId);

  if (db.isAdmin(userId) && session && session.action === 'WAITING_MUSIC') {
    const audio = ctx.message.audio;
    const track = {
      id: `track_${Date.now()}`,
      title: audio.title || audio.file_name || 'Musik Baru',
      artist: audio.performer || ctx.from.first_name || 'Admin',
      type: 'file_id',
      source: audio.file_id,
      added_by: ctx.from.first_name,
      date: new Date().toISOString().split('T')[0]
    };

    db.addMusic(track);
    adminMenu.clearAdminSession(userId);

    return ctx.reply(
      `✅ *MUSIK BERHASIL DITAMBAHKAN!*\n\n🎶 *Judul:* ${track.title}\n👤 *Artis:* ${track.artist}\n💿 Musik sekarang sudah tersedia di Playlist untuk semua pengguna bot.`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '🎵 Lihat Playlist Musik', callback_data: 'menu_music' }],
          [{ text: '👑 Kembali ke Admin', callback_data: 'menu_admin' }]
        ]}
      }
    );
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
          reply_markup: { inline_keyboard: [[{ text: '👑 Kembali ke Admin Panel', callback_data: 'menu_admin' }]] }
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
        } catch {
          failed++;
        }
      }

      await ctx.telegram.deleteMessage(ctx.chat.id, notifyMsg.message_id).catch(() => {});
      return ctx.reply(`✅ *Broadcast Selesai!*\n\n• Berhasil dikirim: *${sent} user*\n• Gagal (blokir/nonaktif): *${failed} user*`, { parse_mode: 'Markdown' });
    }
  }

  // 2. Active Games - Math Challenge
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

  // 3. Active Games - Word Game
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

  // 4. Active Guessing Games
  if (games.getNumberGame(userId)) {
    const guessRes = games.processNumberGuess(userId, text);
    if (guessRes) {
      db.incrementStat('total_games_played');
      return ctx.reply(guessRes.message, { parse_mode: 'Markdown' });
    }
  }

  // 5. Active Quiz/Trivia/Emoji
  if (games.getActiveRiddle(userId)) {
    const quizRes = games.answerRiddle(userId, text);
    if (quizRes) {
      if (quizRes.success) {
        db.incrementStat('total_games_played');
        return ctx.reply(
          `🎉 *BENAR SEKALI! JAWABANMU TEPAT!*\n\nJawabannya adalah: *${quizRes.answer}*`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [
              [{ text: '🧩 Kuis Lainnya', callback_data: 'game_quiz_start' }],
              [{ text: '🎯 Trivia Quiz', callback_data: 'game_trivia_start' }],
              [{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]
            ]}
          }
        );
      } else {
        return ctx.reply(`❌ Jawaban belum tepat! Coba lagi.\n💡 Petunjuk: ${quizRes.hint}`);
      }
    }
  }

  // 6. Auto-detect Video URL
  if (downloader.detectPlatform(text)) {
    return handleDownloadRequest(ctx, text);
  }

  // 7. Default Fallback
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
console.log('🤖 TELEGRAM BOT MULTIFUNGSI PREMIUM v2.0');
console.log(`📁 Lokasi: ${__dirname}`);
console.log(`👑 Owner ID: ${config.ownerId || 'Belum diatur'}`);
console.log('==============================================');

bot.telegram.getMe().then(async (me) => {
  console.log(`🚀 Terhubung sebagai @${me.username} (${me.first_name})`);
  console.log('Bot aktif dalam mode Long Polling (Siap menerima pesan).');
  
  // Initialize prayer time reminders
  try {
    await sholat.initSholatReminder(bot);
    console.log('🕌 Prayer time reminder system initialized successfully!');
  } catch (err) {
    console.error('⚠️ Failed to initialize prayer reminders:', err.message);
  }
  
  return bot.launch();
}).catch((err) => {
  console.error('❌ Gagal menjalankan bot Telegram:', err.message);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
