const axios = require('axios');
const cron = require('node-cron');
const db = require('../db');

// Jakarta coordinates for Jabodetabek
const JAKARTA_LAT = -6.2088;
const JAKARTA_LNG = 106.8456;
const TIMEZONE = 'Asia/Jakarta';

// Beautiful Islamic-themed messages for each prayer
const PRAYER_MESSAGES = {
  Fajr: [
    '🌅 *WAKTU SUBUH TELAH TIBA* 🌅\n\n🕌 _\"Sholat itu lebih baik daripada tidur\"_\n\n╭───「 ⏰ ADZAN SUBUH 」\n├ 📍 Wilayah: Jabodetabek\n├ 🤲 Ayo bangun dan tunaikan sholat Subuh\n├ 💎 2 rakaat yang lebih baik dari dunia\n├    dan seisinya\n╰───────────────────────────\n\n_Barangsiapa sholat Subuh berjamaah, maka ia berada dalam jaminan Allah_ 🤲',
    '🌄 *ADZAN SUBUH BERKUMANDANG* 🌄\n\n🕋 _\"Ash-sholatu khairum minan naum\"_\n\n╭───「 🌟 SUBUH HADIR 」\n├ 📍 Jabodetabek & Sekitarnya\n├ 🤲 Bangunlah wahai hamba Allah\n├ 🌙 Tinggalkan selimut, raih pahala\n├ ✨ Malaikat mencatat amalmu\n╰───────────────────────────\n\n_Ya Allah, jadikan kami hamba yang selalu menjaga sholat Subuh_ 🤲',
  ],
  Dhuhr: [
    '☀️ *WAKTU DZUHUR TELAH TIBA* ☀️\n\n🕌 _\"Tegakkanlah sholat, sesungguhnya sholat itu mencegah dari perbuatan keji dan mungkar\"_\n\n╭───「 ⏰ ADZAN DZUHUR 」\n├ 📍 Wilayah: Jabodetabek\n├ 🤲 Istirahatkan sejenak aktivitasmu\n├ 🕋 4 rakaat penuh keberkahan\n├ 💫 Jangan tunda, segera tunaikan\n╰───────────────────────────\n\n_Sholat Dzuhur di awal waktu adalah amalan yang paling dicintai Allah_ 🤲',
    '🌤️ *ADZAN DZUHUR BERKUMANDANG* 🌤️\n\n🕋 _\"Hayya alash sholah, hayya alal falah\"_\n\n╭───「 🌟 DZUHUR HADIR 」\n├ 📍 Jabodetabek & Sekitarnya\n├ 🤲 Mari bergegas menuju kebaikan\n├ 📿 Luangkan waktu untuk-Nya\n├ ✨ Jangan biarkan kesibukan menghalangi\n╰───────────────────────────\n\n_Ya Allah, jadikan sholat sebagai penyejuk hati kami_ 🤲',
  ],
  Asr: [
    '🌇 *WAKTU ASHAR TELAH TIBA* 🌇\n\n🕌 _\"Demi masa, sesungguhnya manusia berada dalam kerugian\"_\n\n╭───「 ⏰ ADZAN ASHAR 」\n├ 📍 Wilayah: Jabodetabek\n├ 🤲 Jaga sholatmu sebelum matahari\n├    terbenam\n├ ⚠️ Jangan sampai meninggalkan Ashar!\n├ 🕋 4 rakaat penjaga iman\n╰───────────────────────────\n\n_Barangsiapa meninggalkan sholat Ashar, maka amalnya akan gugur_ 🤲',
    '🏙️ *ADZAN ASHAR BERKUMANDANG* 🏙️\n\n🕋 _\"Peliharalah semua sholatmu, terutama sholat pertengahan (Ashar)\"_\n\n╭───「 🌟 ASHAR HADIR 」\n├ 📍 Jabodetabek & Sekitarnya\n├ 🤲 Sore telah datang, waktunya ibadah\n├ 📿 Jangan lalai dengan dunia\n├ ✨ Ingatlah, hidup ini sementara\n╰───────────────────────────\n\n_Ya Allah, jangan jadikan kami orang yang melalaikan sholat_ 🤲',
  ],
  Maghrib: [
    '🌆 *WAKTU MAGHRIB TELAH TIBA* 🌆\n\n🕌 _\"Ketika matahari terbenam, segeralah sholat\"_\n\n╭───「 ⏰ ADZAN MAGHRIB 」\n├ 📍 Wilayah: Jabodetabek\n├ 🤲 Waktu berbuka & sholat Maghrib\n├ 🌙 3 rakaat pembuka malam\n├ 🍽️ Berbuka dengan yang manis\n├ 🕋 Lalu segera tunaikan sholat\n╰───────────────────────────\n\n_Ya Allah, terima ibadah kami dan ampuni dosa-dosa kami_ 🤲',
    '🌅 *ADZAN MAGHRIB BERKUMANDANG* 🌅\n\n🕋 _\"Allahu Akbar, Allahu Akbar\"_\n\n╭───「 🌟 MAGHRIB HADIR 」\n├ 📍 Jabodetabek & Sekitarnya\n├ 🤲 Matahari terbenam, saatnya ibadah\n├ 🌙 Segera tunaikan 3 rakaat\n├ ✨ Jangan tunda walau sedetik\n╰───────────────────────────\n\n_Sholat Maghrib memiliki waktu yang sangat singkat, segeralah!_ 🤲',
  ],
  Isha: [
    '🌙 *WAKTU ISYA TELAH TIBA* 🌙\n\n🕌 _\"Dan dirikanlah sholat pada kedua tepi siang dan pada permulaan malam\"_\n\n╭───「 ⏰ ADZAN ISYA 」\n├ 📍 Wilayah: Jabodetabek\n├ 🤲 Penutup ibadah sholat hari ini\n├ 🌟 4 rakaat pengunci iman\n├ 💤 Tidur setelah Isya = Sunnah\n├ 🕋 Sempurnakan 5 waktu hari ini\n╰───────────────────────────\n\n_Barangsiapa sholat Isya berjamaah, seolah ia qiyamul lail separuh malam_ 🤲',
    '✨ *ADZAN ISYA BERKUMANDANG* ✨\n\n🕋 _\"Hayya alash sholah, hayya alal falah\"_\n\n╭───「 🌟 ISYA HADIR 」\n├ 📍 Jabodetabek & Sekitarnya\n├ 🤲 Malam telah tiba, waktunya ibadah\n├ 📿 Tutup harimu dengan sholat\n├ 🌙 4 rakaat penutup hari\n├ ✨ Lalu istirahat dengan tenang\n╰───────────────────────────\n\n_Ya Allah, terima semua ibadah kami hari ini dan ampuni kelalaian kami_ 🤲',
  ]
};

// Store scheduled cron jobs
let scheduledJobs = [];
let botInstance = null;
let todayPrayerTimes = null;
let lastFetchDate = null;

function getRandomMessage(prayer) {
  const messages = PRAYER_MESSAGES[prayer];
  if (!messages || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

// Fetch prayer times from Aladhan API
async function fetchPrayerTimes() {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const [year, month, day] = today.split('-');
    
    const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${JAKARTA_LAT}&longitude=${JAKARTA_LNG}&method=20`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.data && response.data.data.timings) {
      todayPrayerTimes = response.data.data.timings;
      lastFetchDate = today;
      console.log(`🕌 Prayer times fetched for ${today}:`, {
        Fajr: todayPrayerTimes.Fajr,
        Dhuhr: todayPrayerTimes.Dhuhr,
        Asr: todayPrayerTimes.Asr,
        Maghrib: todayPrayerTimes.Maghrib,
        Isha: todayPrayerTimes.Isha
      });
      return todayPrayerTimes;
    }
    return null;
  } catch (err) {
    console.error('❌ Failed to fetch prayer times:', err.message);
    return null;
  }
}

// Broadcast prayer reminder to all users
async function broadcastPrayerReminder(prayerName) {
  if (!botInstance) return;
  
  const message = getRandomMessage(prayerName);
  if (!message) return;
  
  const users = db.getUserList();
  let sent = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      await botInstance.telegram.sendMessage(user.id, message, { parse_mode: 'Markdown' });
      sent++;
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      failed++;
    }
  }
  
  console.log(`🕌 ${prayerName} reminder sent: ${sent} success, ${failed} failed`);
}

// Schedule prayer time reminders
async function schedulePrayerReminders() {
  // Clear existing jobs
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs = [];
  
  const times = await fetchPrayerTimes();
  if (!times) {
    console.error('❌ Cannot schedule prayer reminders: no prayer times available');
    return;
  }
  
  const prayerMap = {
    Fajr: times.Fajr,
    Dhuhr: times.Dhuhr,
    Asr: times.Asr,
    Maghrib: times.Maghrib,
    Isha: times.Isha
  };
  
  const prayerNames = {
    Fajr: 'Subuh',
    Dhuhr: 'Dzuhur',
    Asr: 'Ashar',
    Maghrib: 'Maghrib',
    Isha: 'Isya'
  };
  
  for (const [prayer, time] of Object.entries(prayerMap)) {
    if (!time) continue;
    
    // Parse HH:MM format (remove timezone info if any)
    const cleanTime = time.split(' ')[0]; // Remove "(WIB)" etc.
    const [hours, minutes] = cleanTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) continue;
    
    // Create cron expression: minute hour * * *
    const cronExpr = `${minutes} ${hours} * * *`;
    
    try {
      const job = cron.schedule(cronExpr, () => {
        console.log(`🕌 Triggering ${prayerNames[prayer]} (${prayer}) reminder at ${cleanTime} WIB`);
        broadcastPrayerReminder(prayer);
      }, {
        timezone: TIMEZONE
      });
      
      scheduledJobs.push(job);
      console.log(`✅ Scheduled ${prayerNames[prayer]} reminder at ${cleanTime} WIB (cron: ${cronExpr})`);
    } catch (err) {
      console.error(`❌ Failed to schedule ${prayer}:`, err.message);
    }
  }
  
  // Schedule daily refresh at 00:05 to get new prayer times
  const refreshJob = cron.schedule('5 0 * * *', async () => {
    console.log('🔄 Refreshing prayer times for new day...');
    await schedulePrayerReminders();
  }, {
    timezone: TIMEZONE
  });
  scheduledJobs.push(refreshJob);
  console.log('✅ Daily prayer time refresh scheduled at 00:05 WIB');
}

// Initialize the sholat reminder system
async function initSholatReminder(bot) {
  botInstance = bot;
  console.log('🕌 Initializing prayer time reminder system for Jabodetabek...');
  await schedulePrayerReminders();
}

// Get today's prayer times for display
async function getPrayerTimesDisplay() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  
  if (!todayPrayerTimes || lastFetchDate !== today) {
    await fetchPrayerTimes();
  }
  
  if (!todayPrayerTimes) {
    return null;
  }
  
  return {
    subuh: todayPrayerTimes.Fajr ? todayPrayerTimes.Fajr.split(' ')[0] : '-',
    dzuhur: todayPrayerTimes.Dhuhr ? todayPrayerTimes.Dhuhr.split(' ')[0] : '-',
    ashar: todayPrayerTimes.Asr ? todayPrayerTimes.Asr.split(' ')[0] : '-',
    maghrib: todayPrayerTimes.Maghrib ? todayPrayerTimes.Maghrib.split(' ')[0] : '-',
    isya: todayPrayerTimes.Isha ? todayPrayerTimes.Isha.split(' ')[0] : '-',
    sunrise: todayPrayerTimes.Sunrise ? todayPrayerTimes.Sunrise.split(' ')[0] : '-',
    date: today
  };
}

module.exports = {
  initSholatReminder,
  getPrayerTimesDisplay,
  broadcastPrayerReminder,
  fetchPrayerTimes
};
