const db = require('../db');

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

  const text = 
`╭───「 👑 *DASHBOARD ADMIN VIP* 」
├ 🛡️ Akses Level: *SUPER OWNER & ADMIN*
├ 👥 Total Pengguna: \`${users.length} user\`
├ 🛡️ Total Admin: \`${admins.length} orang\`
├ 🎶 Playlist Musik: \`${musicList.length} lagu\`
├ 🖼️ Tipe Banner: \`${(dbData.settings && dbData.settings.banner_type) || 'url'}\`
╰───────────────────────────

👉 *Pilih menu pengelolaan bot:*`;

  const inlineKeyboard = [
    [
      { text: '🖼️ ❲ GANTI BANNER BOT ❳', callback_data: 'admin_edit_banner' },
      { text: '🎶 ❲ TAMBAH MUSIK ❳', callback_data: 'admin_add_music' }
    ],
    [
      { text: '👥 ❲ TAMBAH ADMIN ❳', callback_data: 'admin_add_user' },
      { text: '📋 ❲ DAFTAR ADMIN ❳', callback_data: 'admin_list' }
    ],
    [
      { text: '🎵 ❲ KELOLA PLAYLIST ❳', callback_data: 'admin_manage_music' },
      { text: '📢 ❲ BROADCAST PESAN ❳', callback_data: 'admin_broadcast' }
    ],
    [
      { text: '🔙 ❲ KEMBALI KE USER MENU ❳', callback_data: 'menu_main' }
    ]
  ];

  return { text, inlineKeyboard, banner };
}

function getAdminListMenu() {
  const admins = db.getAdmins();
  let text = 
`╭───「 📋 *DAFTAR ADMIN AKTIF* 」
`;

  admins.forEach((id, idx) => {
    text += `├ ${idx + 1}. \`${id}\` ${idx === 0 ? '👑 (Super Owner)' : '🛡️ (Admin)'}\n`;
  });

  text += 
`╰───────────────────────────
💡 _Untuk hapus admin gunakan:_ \`/deladmin <user_id>\``;

  const inlineKeyboard = [
    [{ text: '➕ ❲ TAMBAH ADMIN BARU ❳', callback_data: 'admin_add_user' }],
    [{ text: '🔙 ❲ KEMBALI KE ADMIN ❳', callback_data: 'menu_admin' }]
  ];

  return { text, inlineKeyboard };
}

function getMusicManageMenu() {
  const musicList = db.getMusicList();
  if (musicList.length === 0) {
    return {
      text: 
`╭───「 🎵 *KELOLA PLAYLIST MUSIK* 」
├ ℹ️ Belum ada lagu yang tersimpan.
╰───────────────────────────`,
      inlineKeyboard: [
        [{ text: '➕ ❲ TAMBAH MUSIK BARU ❳', callback_data: 'admin_add_music' }],
        [{ text: '🔙 ❲ KEMBALI KE ADMIN ❳', callback_data: 'menu_admin' }]
      ]
    };
  }

  let text = 
`╭───「 🎵 *KELOLA PLAYLIST MUSIK* 」
`;
  const inlineKeyboard = [];

  musicList.forEach((item, idx) => {
    text += `├ ${idx + 1}. *${item.title}* (${item.artist || 'Artis'})\n`;
    inlineKeyboard.push([
      { text: `🗑️ ❲ Hapus: ${item.title.slice(0, 18)} ❳`, callback_data: `admin_del_music_${item.id}` }
    ]);
  });

  text += `╰───────────────────────────`;

  inlineKeyboard.push([
    { text: '➕ ❲ TAMBAH MUSIK BARU ❳', callback_data: 'admin_add_music' }
  ]);
  inlineKeyboard.push([
    { text: '🔙 ❲ KEMBALI KE ADMIN ❳', callback_data: 'menu_admin' }
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
