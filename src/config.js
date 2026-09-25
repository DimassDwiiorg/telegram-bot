const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  botToken: process.env.BOT_TOKEN || '',
  ownerId: process.env.OWNER_ID ? String(process.env.OWNER_ID).trim() : '',
  port: process.env.PORT || 3000,
  superAdminIds: process.env.SUPER_ADMIN_IDS || process.env.OWNER_ID || '',
  dbPath: path.join(__dirname, '..', 'data', 'database.json'),
  assetsDir: path.join(__dirname, '..', 'data', 'assets')
};

module.exports = config;
