const db = require('../db');

// State tracker for admin action sessions
// adminId -> { action: 'WAITING_BANNER' | 'WAITING_MUSIC' | 'WAITING_ADMIN' | 'WAITING_BROADCAST', step: 1, temp: {} }
const adminSessions = new Map();

function setAdminSession(adminId, sessionData) {
  if (!sessionData) {
    adminSessions.delete(String(adminId));
  } else {
    adminSessions.set(String(adminId), sessionData);
  }
}

function getAdminSession(adminId) {
  return adminSessions.get(String(adminId));
}

function clearAdminSession(adminId) {
  adminSessions.delete(String(adminId));
}

function getAdminDashboard() {
  const admins = db.getAdmins();
  const musicList = db.getMusicList();
  const users = db.getUserList();
  const dbData = db.getDb();
  const banner = db.getBanner();

  const text = `👑 *PANEL KENDALI ADMIN*\n\n` +
    `Selamat datang di Dashboard Admin. Di sini Anda dapat mengelola banner, musik, admin lain, dan siaran pesan.\n\n` +
    `📊 *Ringkasan Sistem:*\n` +
    `• 👥 Total Pengguna: *${users.length} user*\n` +
    `• 🛡️ Jumlah Admin: *${admins.length} orang*\n` +
    `• 🎶 Koleksi Musik: *${musicList.length} lagu*\n` +
    `• 🖼️ Banner Tipe: *${dbData.settings?.banner_type || 'url'}*\n\n` +
    `👇 *Pilih menu aksi admin:*`;

  const inlineKeyboard = [
    [
      { text: '🖼️ Edit Foto Banner Bot', callback_data: 'admin_edit_banner' },
      { text: '🎶 Nambahin Musik Bot', callback_data: 'admin_add_music' }
    ],
    [
      { text: '👥 Tambah Admin Baru', callback_data: 'admin_add_user' },
      { text: '📋 Kelola & List Admin', callback_data: 'admin_list' }
    ],
    [
      { text: '🎵 Kelola List Musik', callback_data: 'admin_manage_music' },
      { text: '📢 Broadcast Pesan', callback_data: 'admin_broadcast' }
    ],
    [
      { text: '🔙 Kembali ke Menu User', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard, banner };
}

function getAdminListMenu() {
  const admins = db.getAdmins();
  let text = `📋 *DAFTAR ADMIN BOT AKTIF*\n\n`;

  admins.forEach((id, idx) => {
    text += `${idx + 1}. \`${id}\` ${idx === 0 ? '⭐ (Super Owner)' : '🛡️ (Admin)'}\n`;
  });

  text += `\n_Catatan: Untuk menghapus admin, gunakan perintah:_\n\`/deladmin <user_id>\``;

  const inlineKeyboard = [
    [{ text: '➕ Tambah Admin Baru', callback_data: 'admin_add_user' }],
    [{ text: '🔙 Kembali ke Panel Admin', callback_data: 'menu_admin' }]
  ];

  return { text, inlineKeyboard };
}

function getMusicManageMenu() {
  const musicList = db.getMusicList();
  if (musicList.length === 0) {
    return {
      text: `🎵 *KELOLA KOLEKSI MUSIK*\n\nBelum ada musik dalam playlist bot.\nTekan tombol di bawah untuk menambahkan musik baru.`,
      inlineKeyboard: [
        [{ text: '➕ Tambah Musik Baru', callback_data: 'admin_add_music' }],
        [{ text: '🔙 Kembali ke Panel Admin', callback_data: 'menu_admin' }]
      ]
    };
  }

  let text = `🎵 *DAFTAR KOLEKSI MUSIK BOT*\n\n`;
  const inlineKeyboard = [];

  musicList.forEach((item, idx) => {
    text += `${idx + 1}. *${item.title}* (${item.artist || 'Artis'})\n   _ID:_ \`${item.id}\`\n`;
    inlineKeyboard.push([
      { text: `❌ Hapus: ${item.title.slice(0, 20)}`, callback_data: `admin_del_music_${item.id}` }
    ]);
  });

  inlineKeyboard.push([
    { text: '➕ Tambah Musik Baru', callback_data: 'admin_add_music' }
  ]);
  inlineKeyboard.push([
    { text: '🔙 Kembali ke Panel Admin', callback_data: 'menu_admin' }
  ]);

  return { text, inlineKeyboard };
}

module.exports = {
  setAdminSession,
  getAdminSession,
  clearAdminSession,
  getAdminDashboard,
  getAdminListMenu,
  getMusicManageMenu
};
