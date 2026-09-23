const db = require('../db');

function authMiddleware(ctx, next) {
  if (ctx.from) {
    db.registerUser(ctx.from);
    ctx.state.isAdmin = db.isAdmin(ctx.from.id);
  }
  return next();
}

function adminOnly(ctx, next) {
  const userId = ctx.from ? ctx.from.id : null;
  if (!db.isAdmin(userId)) {
    if (ctx.callbackQuery) {
      return ctx.answerCbQuery('⛔ Akses ditolak! Perintah ini khusus Admin.', { show_alert: true });
    }
    return ctx.reply('⛔ *AKSES DITOLAK*\nMaaf, Anda bukan admin bot ini.', { parse_mode: 'Markdown' });
  }
  return next();
}

module.exports = {
  authMiddleware,
  adminOnly
};
