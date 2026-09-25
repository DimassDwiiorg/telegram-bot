const QRCode = require('qrcode');
const os = require('os');
const axios = require('axios');

// ===========================
// QR CODE GENERATOR
// ===========================
async function generateQrBuffer(text) {
  try {
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 400,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    return buffer;
  } catch (err) {
    console.error('QR Generator Error:', err.message);
    throw err;
  }
}

// ===========================
// TEXT TO SPEECH
// ===========================
function getTtsAudioUrl(text, lang = 'id') {
  const clean = encodeURIComponent(text.slice(0, 200));
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${clean}&tl=${lang}&client=tw-ob`;
}

// ===========================
// SERVER SPECS
// ===========================
function getServerSpecs(botStartTime) {
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (3600 * 24));
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const usedMem = (totalMem - freeMem).toFixed(2);
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: (os.cpus() && os.cpus()[0] && os.cpus()[0].model) || 'Generic CPU',
    cpuCores: (os.cpus() && os.cpus().length) || 1,
    ram: `${usedMem} GB / ${totalMem} GB (${memUsagePercent}%)`,
    nodeVersion: process.version,
    uptime: `${days}h ${hours}j ${minutes}m ${seconds}d`
  };
}

// ===========================
// SAFE MATH CALCULATOR
// ===========================
function calculateMath(expression) {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().^ ]/g, '');
    if (!sanitized) return null;
    const expr = sanitized.replace(/\^/g, '**');
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

// ===========================
// QUOTES / KATA BIJAK (Expanded)
// ===========================
const QUOTES = [
  "Kesuksesan berawal dari keputusan untuk mencoba, bukan menunggu waktu yang sempurna.",
  "Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.",
  "Jangan takut melangkah perlahan, takutlah saat kamu hanya berdiam diri.",
  "Setiap kesulitan selalu menyediakan jalan keluar bagi mereka yang tidak lelah berikhtiar.",
  "Hari ini adalah kesempatan baru untuk menjadi versi dirimu yang lebih baik.",
  "Satu-satunya cara melakukan pekerjaan hebat adalah mencintai apa yang kamu kerjakan. - Steve Jobs",
  "Jangan biarkan kemarin menghabiskan terlalu banyak hari ini. - Will Rogers",
  "Masa depan milik mereka yang percaya pada keindahan mimpi-mimpinya. - Eleanor Roosevelt",
  "Kegagalan adalah bumbu yang memberi rasa pada kesuksesan. - Truman Capote",
  "Hidup bukan tentang menunggu badai berlalu, tapi belajar menari di tengah hujan.",
  "Seorang pemenang adalah pemimpi yang tidak pernah menyerah. - Nelson Mandela",
  "Ilmu itu lebih baik dari harta. Ilmu akan menjagamu, sedangkan harta kamu yang menjaganya. - Ali bin Abi Thalib",
  "Jadilah perubahan yang ingin kamu lihat di dunia. - Mahatma Gandhi",
  "Kesulitan mempersiapkan orang biasa untuk takdir yang luar biasa. - C.S. Lewis",
  "Orang yang paling bahagia tidak memiliki segalanya, tetapi mampu menikmati setiap yang dimilikinya.",
  "Barangsiapa menempuh jalan untuk mencari ilmu, niscaya Allah memudahkan jalannya menuju surga. - HR Muslim",
  "Pendidikan adalah senjata paling mematikan di dunia, karena dengannya kamu dapat mengubah dunia. - Nelson Mandela",
  "Jika kamu tidak mampu bersabar, kamu tidak layak sukses.",
  "Bersyukurlah atas apa yang kamu miliki, kamu akan memiliki lebih banyak lagi.",
  "Waktu terbaik untuk menanam pohon adalah 20 tahun lalu. Waktu terbaik kedua adalah sekarang."
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ===========================
// WEATHER (wttr.in API)
// ===========================
async function getWeather(city = 'Jakarta') {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await axios.get(url, { timeout: 8000 });
    const current = res.data.current_condition[0];
    const area = res.data.nearest_area[0];
    
    return {
      success: true,
      city: area.areaName[0].value || city,
      country: area.country[0].value || '',
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      humidity: current.humidity,
      wind: current.windspeedKmph,
      windDir: current.winddir16Point,
      desc: current.weatherDesc[0].value,
      visibility: current.visibility,
      pressure: current.pressure,
      uvIndex: current.uvIndex,
      cloudCover: current.cloudcover,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===========================
// TRANSLATE (MyMemory API - Free)
// ===========================
async function translateText(text, fromLang = 'id', toLang = 'en') {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data && res.data.responseData) {
      return {
        success: true,
        translated: res.data.responseData.translatedText,
        from: fromLang,
        to: toLang
      };
    }
    return { success: false, error: 'Gagal menerjemahkan' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===========================
// WIKIPEDIA SEARCH
// ===========================
async function searchWikipedia(query, lang = 'id') {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data && res.data.extract) {
      return {
        success: true,
        title: res.data.title,
        extract: res.data.extract.slice(0, 800),
        url: res.data.content_urls?.desktop?.page || '',
        thumbnail: res.data.thumbnail?.source || null
      };
    }
    return { success: false, error: 'Artikel tidak ditemukan' };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { success: false, error: 'Artikel tidak ditemukan di Wikipedia' };
    }
    return { success: false, error: err.message };
  }
}

// ===========================
// CURRENCY CONVERTER (ExchangeRate API)
// ===========================
async function convertCurrency(amount, from, to) {
  try {
    const url = `https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`;
    const res = await axios.get(url, { timeout: 8000 });
    const rate = res.data.rates[to.toUpperCase()];
    if (!rate) return { success: false, error: `Mata uang ${to} tidak ditemukan` };
    const result = (amount * rate).toFixed(2);
    return {
      success: true,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      result,
      rate: rate.toFixed(4)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===========================
// RANDOM JOKE
// ===========================
const JOKES = [
  { q: "Kenapa ayam nyebrang jalan?", a: "Karena mau ke seberang!" },
  { q: "Apa bedanya kamu sama kucing?", a: "Kucing bisa mengeong, kamu bisa mengeluh!" },
  { q: "Kenapa matematika selalu sedih?", a: "Karena terlalu banyak masalah!" },
  { q: "Apa yang lebih berat, 1 kg besi atau 1 kg kapas?", a: "Sama aja, sama-sama 1 kg! 😄" },
  { q: "Kenapa komputer tidak pernah marah?", a: "Karena dia selalu di-refresh!" },
  { q: "Apa bedanya handphone sama pacar?", a: "Handphone bisa di-charge, pacar belum tentu bisa di-charge!" },
  { q: "Kenapa semut tidak pernah sakit?", a: "Karena mereka punya anti-body yang kecil!" },
  { q: "Motor apa yang bikin capek?", a: "Motor-ik (motorik)!" },
  { q: "Kenapa kucing suka marah-marah?", a: "Karena dia punya PMS (Penyakit Marah Sendiri)!" },
  { q: "Apa yang terjadi kalau buku nikah hilang?", a: "Jadi buku cerai! 😂" },
  { q: "Sapi apa yang kurus?", a: "Sapiku (sapimu juga kurus! 😂)" },
  { q: "Telor apa yang sangar?", a: "Telor asin, soalnya udah di-garemin!" },
  { q: "Kenapa guru suka marah?", a: "Karena muridnya kebanyakan nanya!" },
  { q: "Ikan apa yang nggak bisa berenang?", a: "Ikan asin, udah kering!" },
  { q: "Sayur apa yang paling dingin?", a: "Kol (cool)!" },
];

function getRandomJoke() {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

// ===========================
// RANDOM FACT
// ===========================
const FACTS = [
  "🧠 Otak manusia menggunakan 20% dari total oksigen tubuh.",
  "🐙 Gurita memiliki 3 jantung dan darahnya berwarna biru!",
  "🍯 Madu tidak pernah basi. Arkeolog menemukan madu berusia 3000 tahun yang masih bisa dimakan!",
  "🌊 Lebih dari 80% lautan belum dijelajahi manusia.",
  "⚡ Petir 5 kali lebih panas dari permukaan matahari!",
  "🦈 Hiu sudah ada sebelum dinosaurus, lebih dari 400 juta tahun lalu.",
  "🐝 Seekor lebah harus mengunjungi 2 juta bunga untuk membuat 0.5 kg madu.",
  "🌍 Bumi berputar dengan kecepatan 1.670 km/jam di khatulistiwa!",
  "💎 Hujan berlian terjadi di planet Jupiter dan Saturnus.",
  "🐘 Gajah adalah satu-satunya hewan yang tidak bisa melompat.",
  "📱 Ponsel pertama dijual seharga Rp 55 juta (tahun 1983)!",
  "🌙 Bulan menjauh dari bumi sekitar 3.8 cm setiap tahun.",
  "🦕 T-Rex hidup lebih dekat waktunya dengan kita daripada dengan Stegosaurus!",
  "🧬 DNA manusia 99.9% identik satu sama lain.",
  "🌲 Pohon tertua di dunia berusia lebih dari 5.000 tahun!",
  "🎵 Musik bisa menurunkan tekanan darah dan mengurangi stres.",
  "🌈 Pelangi sebenarnya berbentuk lingkaran penuh, tapi kita hanya melihat setengahnya.",
  "🧊 Air panas membeku lebih cepat dari air dingin (Efek Mpemba)!",
  "🐬 Lumba-lumba tidur dengan satu mata terbuka.",
  "🌋 Ada lebih dari 1.500 gunung berapi aktif di dunia, 130 ada di Indonesia!"
];

function getRandomFact() {
  return FACTS[Math.floor(Math.random() * FACTS.length)];
}

// ===========================
// PASSWORD GENERATOR
// ===========================
function generatePassword(length = 16) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = upper + lower + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  return password;
}

// ===========================
// BASE64 ENCODE/DECODE
// ===========================
function base64Encode(text) {
  return Buffer.from(text, 'utf-8').toString('base64');
}

function base64Decode(text) {
  try {
    return Buffer.from(text, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

// ===========================
// IP LOOKUP
// ===========================
async function ipLookup(ip) {
  try {
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data.status === 'success') {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.data.message || 'IP tidak ditemukan' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===========================
// RANDOM COLOR
// ===========================
function getRandomColor() {
  const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    hex: `#${hex.toUpperCase()}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    r, g, b
  };
}

// ===========================
// TEXT STYLES (Fancy Text)
// ===========================
function toFancyText(text) {
  const styles = {
    bold: text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + code - 97);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + code - 48);
      return c;
    }).join(''),
    italic: text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D434 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D44E + code - 97);
      return c;
    }).join(''),
    monospace: text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D670 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + code - 97);
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7F6 + code - 48);
      return c;
    }).join(''),
    circled: text.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + code - 97);
      return c;
    }).join(''),
  };
  return styles;
}

// ===========================
// COUNTDOWN TIMER
// ===========================
function getCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return null;
  
  const diff = target - now;
  if (diff <= 0) return { expired: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { expired: false, days, hours, minutes, seconds, diff };
}

// ===========================
// RANDOM ANIMAL IMAGE (shibe.online)
// ===========================
async function getRandomAnimalImage(type = 'shibes') {
  try {
    const url = `https://shibe.online/api/${type}?count=1&urls=true`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data && res.data[0]) {
      return { success: true, url: res.data[0], type };
    }
    return { success: false, error: 'Gagal mengambil gambar' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===========================
// AGE CALCULATOR
// ===========================
function calculateAge(birthdate) {
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  
  return { years, months, days, totalDays, totalWeeks, totalMonths };
}

// ===========================
// BMI CALCULATOR
// ===========================
function calculateBMI(weight, height) {
  // weight in kg, height in cm
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const bmiRounded = bmi.toFixed(1);
  
  let category = '';
  let emoji = '';
  if (bmi < 18.5) { category = 'Kurus (Underweight)'; emoji = '😟'; }
  else if (bmi < 25) { category = 'Normal (Ideal)'; emoji = '💪'; }
  else if (bmi < 30) { category = 'Gemuk (Overweight)'; emoji = '⚠️'; }
  else { category = 'Obesitas'; emoji = '🏥'; }
  
  return { bmi: bmiRounded, category, emoji, weight, height };
}

// ===========================
// TEXT COUNTER / WORD COUNTER
// ===========================
function countText(text) {
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const lines = text.split('\n').length;
  
  return { chars, charsNoSpace, words, sentences, paragraphs, lines };
}

// ===========================
// ROMAN NUMERAL CONVERTER
// ===========================
function toRoman(num) {
  if (num < 1 || num > 3999) return null;
  const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const rom = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < val.length; i++) {
    while (num >= val[i]) {
      result += rom[i];
      num -= val[i];
    }
  }
  return result;
}

module.exports = {
  generateQrBuffer,
  getTtsAudioUrl,
  getServerSpecs,
  calculateMath,
  getRandomQuote,
  // New Tools
  getWeather,
  translateText,
  searchWikipedia,
  convertCurrency,
  getRandomJoke,
  getRandomFact,
  generatePassword,
  base64Encode,
  base64Decode,
  ipLookup,
  getRandomColor,
  toFancyText,
  getCountdown,
  getRandomAnimalImage,
  calculateAge,
  calculateBMI,
  countText,
  toRoman,
};
