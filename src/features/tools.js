const QRCode = require('qrcode');
const os = require('os');
const axios = require('axios');

// Generate QR Code Buffer
async function generateQrBuffer(text) {
  try {
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return buffer;
  } catch (err) {
    console.error('QR Generator Error:', err.message);
    throw err;
  }
}

// Text to Speech Audio URL (Google Translate TTS voice)
function getTtsAudioUrl(text, lang = 'id') {
  const clean = encodeURIComponent(text.slice(0, 200));
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${clean}&tl=${lang}&client=tw-ob`;
}

// Server Specs & Ping Info
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

// Safe Math Calculation
function calculateMath(expression) {
  try {
    // Only allow digits, basic operators and spaces
    const sanitized = expression.replace(/[^0-9+\-*/().^ ]/g, '');
    if (!sanitized) return null;
    // Replace ^ with **
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

// Kata Mutiara / Motivasi
const QUOTES = [
  "“Kesuksesan berawal dari keputusan untuk mencoba, bukan menunggu waktu yang sempurna.”",
  "“Kerja keras mengalahkan bakat ketika bakat tidak bekerja keras.”",
  "“Jangan takut melangkah perlahan, takutlah saat kamu hanya berdiam diri.”",
  "“Setiap kesulitan selalu menyediakan jalan keluar bagi mereka yang tidak lelah berikhtiar.”",
  "“Hari ini adalah kesempatan baru untuk menjadi versi dirimu yang lebih baik.”"
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

module.exports = {
  generateQrBuffer,
  getTtsAudioUrl,
  getServerSpecs,
  calculateMath,
  getRandomQuote
};
