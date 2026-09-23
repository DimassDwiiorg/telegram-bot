const db = require('../db');

function formatMusicMenu() {
  const list = db.getMusicList();
  if (list.length === 0) {
    return {
      text: "🎵 *PLAYLIST MUSIK BOT*\n\nSaat ini belum ada lagu di playlist bot.\n_Admin dapat menambahkan lagu melalui Panel Admin._",
      buttons: [[{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]]
    };
  }

  let text = "🎵 *PLAYLIST MUSIK BOT*\n\nPilih lagu di bawah untuk langsung memutarnya di Telegram:\n\n";
  const buttons = [];

  list.forEach((item, index) => {
    const num = index + 1;
    text += `${num}. 🎶 *${item.title}* (${item.artist || 'Unknown'})\n`;
    buttons.push([{ text: `▶️ Putar: ${item.title.slice(0, 25)}`, callback_data: `play_music_${item.id}` }]);
  });

  buttons.push([{ text: '🔙 Kembali ke Menu Utama', callback_data: 'menu_main' }]);

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
        caption: `🎶 *Sedang Memutar:* ${track.title}\n👤 *Artis:* ${track.artist || 'Bot Audio'}\n💿 Ditambahkan oleh Admin`,
        parse_mode: 'Markdown'
      });
    } else if (track.type === 'url') {
      await ctx.replyWithAudio({ url: track.source }, {
        title: track.title,
        performer: track.artist || 'Bot Audio',
        caption: `🎶 *Sedang Memutar:* ${track.title}\n👤 *Artis:* ${track.artist || 'Bot Audio'}`,
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
