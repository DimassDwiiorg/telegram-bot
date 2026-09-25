const { exec } = require('child_process');
const config = require('../config');

// Ambil daftar Super Admin dari .env (format: "123,456,789")
const SUPER_ADMINS = (config.superAdminIds || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

// Cek apakah user termasuk Super Admin
function isSuperAdmin(userId) {
  return SUPER_ADMINS.includes(String(userId));
}

// Middleware: blokir kalau bukan Super Admin
async function superAdminOnly(ctx, next) {
  const userId = ctx.from ? ctx.from.id : null;
  if (!isSuperAdmin(userId)) {
    const msg = '⛔ *Akses Ditolak!*\nFitur ini hanya untuk Super Admin.';
    if (ctx.callbackQuery) return ctx.answerCbQuery('⛔ Akses ditolak!', { show_alert: true });
    return ctx.reply(msg, { parse_mode: 'Markdown' });
  }
  return next();
}

// Daftar perintah yang DILARANG (mencegah hal fatal)
// Kamu bisa ubah/hapus sesuai kebutuhan
const FORBIDDEN_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /mkfs/i,
  /dd\s+if=/i,
  /shutdown/i,
  /reboot/i,
  /halt/i,
  /passwd/i,
  /userdel/i,
  />\s*\/dev\/sd/i,
  /:\(\)\s*\{.*\};\s*:/, // fork bomb
];

function isForbidden(cmd) {
  return FORBIDDEN_PATTERNS.some(rx => rx.test(cmd));
}

// Format output biar rapi + aman dari limit 4096 karakter Telegram
function formatOutput(stdout, stderr, err) {
  let out = '';
  if (stdout) out += `📤 *STDOUT:*\n\`\`\`\n${stdout.trim()}\n\`\`\`\n`;
  if (stderr) out += `⚠️ *STDERR:*\n\`\`\`\n${stderr.trim()}\n\`\`\`\n`;
  if (err)    out += `\n❌ *Exit Code:* \`${err.code || 'N/A'}\`\n📝 *Pesan:* ${err.message}`;
  if (!out.trim()) out = '✅ *Selesai.* (tanpa output)';

  // Escape backtick di dalam output biar tidak rusak formatting
  out = out.replace(/```/g, '` ` `');

  if (out.length > 4000) out = out.slice(0, 4000) + '\n... (output dipotong)';
  return out;
}

// Handler utama /cmd
async function handleShellCmd(ctx) {
  const raw = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!raw) {
    return ctx.reply(
`⚠️ *Format salah!*
Gunakan: \`/cmd <perintah shell>\`

*Contoh:*
\`/cmd ls -la\`
\`/cmd df -h\`
\`/cmd pm2 list\`
\`/cmd uptime\``,
      { parse_mode: 'Markdown' }
    );
  }

  if (isForbidden(raw)) {
    return ctx.reply('🚫 *Perintah diblokir* karena berpotensi merusak server.', { parse_mode: 'Markdown' });
  }

  const waitMsg = await ctx.reply(`⏳ *Menjalankan:*\n\`${raw}\``, { parse_mode: 'Markdown' });

  // Timeout 30 detik, max buffer 1MB
  exec(raw, { timeout: 30000, maxBuffer: 1024 * 1024, shell: '/bin/bash' }, async (err, stdout, stderr) => {
    const output = formatOutput(stdout, stderr, err);

    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitMsg.message_id,
        undefined,
        `🖥️ *CMD:* \`${raw}\`\n\n${output}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      // Kalau edit gagal (misal karena karakter aneh), kirim pesan baru
      await ctx.reply(`🖥️ *CMD:* \`${raw}\`\n\n${output}`, { parse_mode: 'Markdown' }).catch(() => {
        ctx.reply(`CMD: ${raw}\n\n${stdout || stderr || err?.message || 'selesai'}`);
      });
    }
  });
}

module.exports = {
  isSuperAdmin,
  superAdminOnly,
  handleShellCmd,
  SUPER_ADMINS,
};