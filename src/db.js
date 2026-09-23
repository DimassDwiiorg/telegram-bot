const fs = require('fs');
const path = require('path');
const config = require('./config');

function getDb() {
  try {
    if (!fs.existsSync(config.dbPath)) {
      const defaultData = {
        settings: {
          bot_name: "Dimzz Multi-Function Bot",
          banner_type: "url",
          banner_value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80",
          welcome_text: "👋 Halo *{name}*! Selamat datang di *{bot_name}*.\n\nSilakan pilih menu layanan di bawah ini untuk mulai menggunakan bot:"
        },
        admins: [],
        music: [],
        users: {},
        stats: { total_downloads: 0, total_shortlinks: 0, total_games_played: 0 }
      };
      fs.writeFileSync(config.dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(config.dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database:', error.message);
    return {
      settings: {},
      admins: [],
      music: [],
      users: {},
      stats: {}
    };
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(config.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to database:', error.message);
    return false;
  }
}

function isAdmin(userId) {
  if (!userId) return false;
  const strId = String(userId).trim();
  if (config.ownerId && strId === config.ownerId) {
    return true;
  }
  const db = getDb();
  return (db.admins || []).map(String).includes(strId);
}

function addAdmin(userId) {
  const db = getDb();
  const strId = String(userId).trim();
  if (!db.admins) db.admins = [];
  if (!db.admins.map(String).includes(strId)) {
    db.admins.push(strId);
    saveDb(db);
    return true;
  }
  return false;
}

function removeAdmin(userId) {
  const db = getDb();
  const strId = String(userId).trim();
  if (!db.admins) return false;
  const initLen = db.admins.length;
  db.admins = db.admins.filter(id => String(id) !== strId);
  if (db.admins.length !== initLen) {
    saveDb(db);
    return true;
  }
  return false;
}

function getAdmins() {
  const db = getDb();
  const list = [...(db.admins || [])];
  if (config.ownerId && !list.includes(config.ownerId)) {
    list.unshift(config.ownerId);
  }
  return list;
}

function getBanner() {
  const db = getDb();
  return db.settings?.banner_value || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80';
}

function setBanner(bannerValue, type = 'file_id') {
  const db = getDb();
  if (!db.settings) db.settings = {};
  db.settings.banner_value = bannerValue;
  db.settings.banner_type = type;
  saveDb(db);
  return true;
}

function getMusicList() {
  const db = getDb();
  return db.music || [];
}

function addMusic(item) {
  const db = getDb();
  if (!db.music) db.music = [];
  db.music.push(item);
  saveDb(db);
  return item;
}

function deleteMusic(id) {
  const db = getDb();
  if (!db.music) return false;
  const initLen = db.music.length;
  db.music = db.music.filter(m => m.id !== id);
  if (db.music.length !== initLen) {
    saveDb(db);
    return true;
  }
  return false;
}

function registerUser(from) {
  if (!from || !from.id) return;
  const db = getDb();
  if (!db.users) db.users = {};
  const userId = String(from.id);
  db.users[userId] = {
    id: userId,
    first_name: from.first_name || '',
    last_name: from.last_name || '',
    username: from.username || '',
    last_active: new Date().toISOString()
  };
  saveDb(db);
}

function getUserList() {
  const db = getDb();
  return Object.values(db.users || {});
}

function incrementStat(key) {
  const db = getDb();
  if (!db.stats) db.stats = {};
  db.stats[key] = (db.stats[key] || 0) + 1;
  saveDb(db);
}

module.exports = {
  getDb,
  saveDb,
  isAdmin,
  addAdmin,
  removeAdmin,
  getAdmins,
  getBanner,
  setBanner,
  getMusicList,
  addMusic,
  deleteMusic,
  registerUser,
  getUserList,
  incrementStat
};
