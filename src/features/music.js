const db = require('../db');

function formatMusicMenu() {
  const list = db.getMusicList();
  if (list.length === 0) {
    return {
      text: 
`╭───「 🎵 *PLAYLIST MUSIK BOT* 」
├ ℹ️ Belum ada koleksi lagu di bot saat ini.
├ 💡 _Admin dapat menambahkan audio lewat Panel Admin._
╰───────────────────────────`,
      buttons: [[{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]]
    };
  }

  let text = 
`╭───「 🎵 *PLAYLIST MUSIK PREMIUM* 」
├ 🎧 Putar audio favorit langsung di Telegram:
`;
  const buttons = [];

  list.forEach((item, index) => {
    const num = index + 1;
    text += `├ ${num}. 🎶 *${item.title}* (${item.artist || 'Artis'})\n`;
    buttons.push([{ text: `▶️ ❲ Putar: ${item.title.slice(0, 22)} ❳`, callback_data: `play_music_${item.id}` }]);
  });

  text += `╰───────────────────────────`;

  buttons.push([{ text: '🔙 ❲ KEMBALI KE MENU ❳', callback_data: 'menu_main' }]);

  return { text, buttons };
}

async function handlePlayMusic(ctx, trackId) {
  const list = db.getMusicList();
  const track = list.find(t => t.id === trackId);

  if (!track) {
    return ctx.answerCbQuery('Lagu tidak ditemukan atau sudah dihapus!', { show_alert: true });
  }

  await ctx.answerCbQuery(`Memutar: ${track.title}`);

  try {
    if (track.type === 'file_id') {
      await ctx.replyWithAudio(track.source, {
        caption: 
`╭───「 🎶 *NOW PLAYING* 」
├ 🏷️ *Judul:* ${track.title}
├ 👤 *Artis:* ${track.artist || 'Bot Music'}
├ 💿 *Status:* Premium Audio
╰───────────────────────────`,
        parse_mode: 'Markdown'
      });
    } else if (track.type === 'url') {
      await ctx.replyWithAudio({ url: track.source }, {
        title: track.title,
        performer: track.artist || 'Bot Audio',
        caption: 
`╭───「 🎶 *NOW PLAYING* 」
├ 🏷️ *Judul:* ${track.title}
├ 👤 *Artis:* ${track.artist || 'Bot Music'}
╰───────────────────────────`,
        parse_mode: 'Markdown'
      });
    }
  } catch (err) {
    console.error('Play music error:', err.message);
    await ctx.reply(`⚠️ Gagal memutar lagu: ${err.message}`);
  }
}

module.exports = {
  formatMusicMenu,
  handlePlayMusic
};
