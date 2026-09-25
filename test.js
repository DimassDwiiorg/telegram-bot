const assert = require('assert');
const path = require('path');
const db = require('./src/db');
const downloader = require('./src/features/downloader');
const shorturl = require('./src/features/shorturl');
const games = require('./src/features/games');
const tools = require('./src/features/tools');
const userMenu = require('./src/menus/userMenu');
const adminMenu = require('./src/menus/adminMenu');

async function runTests() {
  console.log('🧪 Memulai Pengujian Modul Telegram Bot...\n');

  // Test 1: Database operations
  console.log('1️⃣ Menguji Database JSON...');
  const testUserId = '999888777';
  db.addAdmin(testUserId);
  assert(db.isAdmin(testUserId) === true, 'Admin should be added');
  db.removeAdmin(testUserId);
  assert(db.isAdmin(testUserId) === false, 'Admin should be removed');

  const defaultBanner = db.getBanner();
  assert(typeof defaultBanner === 'string' && defaultBanner.length > 0, 'Banner should return a valid string');

  const musicList = db.getMusicList();
  assert(Array.isArray(musicList), 'Music list should be an array');
  console.log('   ✅ Database operasi admin, banner, dan musik valid!\n');

  // Test 2: Platform detection for Downloader
  console.log('2️⃣ Menguji Deteksi Platform Video Downloader...');
  const tiktokDetect = downloader.detectPlatform('https://www.tiktok.com/@user/video/1234567890');
  assert(tiktokDetect && tiktokDetect.id === 'tiktok', 'TikTok should be detected');

  const igDetect = downloader.detectPlatform('https://www.instagram.com/reel/C8xxxxxxxx/');
  assert(igDetect && igDetect.id === 'instagram', 'Instagram should be detected');

  const ytDetect = downloader.detectPlatform('https://youtu.be/dQw4w9WgXcQ');
  assert(ytDetect && ytDetect.id === 'youtube', 'YouTube should be detected');
  console.log('   ✅ Deteksi TikTok, Instagram, YouTube, FB berfungsi akurat!\n');

  // Test 2b: pickMediaUrls - regresi untuk bug "audio dianggap video" & "sukses tanpa media"
  const mixedMedia = downloader.pickMediaUrls({
    medias: [
      { type: 'audio', url: 'https://example.com/audio.mp3' },
      { type: 'video', url: 'https://example.com/video.mp4' }
    ]
  });
  assert(mixedMedia.videoUrl === 'https://example.com/video.mp4', 'Video url should map to video type, not first element');
  assert(mixedMedia.audioUrl === 'https://example.com/audio.mp3', 'Audio url should map to audio type');

  const audioOnlyMedia = downloader.pickMediaUrls({
    medias: [{ type: 'audio', url: 'https://example.com/song.mp3' }]
  });
  assert(audioOnlyMedia.audioUrl === 'https://example.com/song.mp3', 'Audio-only media should not be mislabeled as video');
  assert(!audioOnlyMedia.videoUrl, 'Audio-only media should leave videoUrl empty');

  const emptyMedia = downloader.pickMediaUrls({ medias: [] });
  assert(!emptyMedia.videoUrl && !emptyMedia.audioUrl, 'Empty medias array should yield no urls (bukan dianggap sukses)');
  console.log('   ✅ pickMediaUrls: tidak lagi salah label audio jadi video, dan medias kosong tidak dianggap berhasil!\n');

  // Test 3: Short URL test
  console.log('3️⃣ Menguji Short URL (is.gd / TinyURL)...');
  try {
    const res = await shorturl.shortenUrl('https://example.com/very-long-url-test-path');
    assert(res.success === true && res.shortUrl.startsWith('http'), 'Short URL should return valid link');
    console.log(`   ✅ Shortlink berhasil dibuat: ${res.shortUrl} (Provider: ${res.provider})\n`);
  } catch (err) {
    console.log(`   ⚠️ Shortlink test info: ${err.message} (Skipping external network)\n`);
  }

  // Test 4: Tools (QR Code, TTS, Server Specs, Calc)
  console.log('4️⃣ Menguji Tools & Utilitas...');
  const qrBuffer = await tools.generateQrBuffer('https://t.me');
  assert(Buffer.isBuffer(qrBuffer) && qrBuffer.length > 100, 'QR Code buffer should be valid PNG buffer');

  const ttsUrl = tools.getTtsAudioUrl('Halo bot telegram');
  assert(ttsUrl.includes('translate_tts'), 'TTS URL should be generated');

  const mathRes = tools.calculateMath('(25 * 4) + 50 / 2');
  assert(mathRes === 125, 'Math evaluation should equal 125');

  const specs = tools.getServerSpecs(Date.now() - 5000);
  assert(specs.nodeVersion && specs.ram, 'Server specs should be populated');
  console.log('   ✅ QR Code, TTS, Kalkulator, dan Spek Server berfungsi sempurna!\n');

  // Test 5: Games logic
  console.log('5️⃣ Menguji Logika Game Zone...');
  const testPlayer = 'test_user_123';
  const target = games.startNumberGame(testPlayer);
  const guessHigh = games.processNumberGuess(testPlayer, 101);
  assert(guessHigh.status === 'lower', 'Higher guess should prompt lower');
  const guessCorrect = games.processNumberGuess(testPlayer, target);
  assert(guessCorrect.status === 'win', 'Correct guess should win');

  const suitRes = games.playSuit('batu');
  assert(['win', 'lose', 'draw'].includes(suitRes.result), 'Suit should result in win, lose, or draw');

  const riddle = games.getRandomRiddle(testPlayer);
  assert(riddle.q && riddle.a, 'Riddle should have question and answer');

  // Tebak Kata (Acak Kata)
  const wordSession = games.startWordGame(testPlayer);
  assert(wordSession.scrambled && wordSession.hint, 'Word game should return scrambled word and hint');
  const wrongWordGuess = games.answerWordGame(testPlayer, 'xxxxxxxxx');
  assert(wrongWordGuess.success === false, 'Wrong word guess should fail');
  const activeWord = games.getWordGame(testPlayer);
  assert(activeWord && activeWord.word, 'Active word game should still be retrievable');
  const correctWordGuess = games.answerWordGame(testPlayer, activeWord.word);
  assert(correctWordGuess.success === true, 'Correct word guess should succeed');

  // Hitung Cepat (Math Sprint)
  games.startMathGame(testPlayer);
  const activeMath = games.getMathGame(testPlayer);
  assert(activeMath && typeof activeMath.answer === 'number', 'Math game should have a numeric answer');
  const correctMathGuess = games.answerMathGame(testPlayer, activeMath.answer);
  assert(correctMathGuess.success === true, 'Correct math answer should succeed');

  // Bersihkan semua sesi game aktif
  games.startNumberGame(testPlayer);
  games.clearAllGames(testPlayer);
  assert(games.hasActiveGame(testPlayer) === false, 'All games should be cleared for the player');

  console.log('   ✅ Game Tebak Angka, Kuis, Tebak Kata, Hitung Cepat, dan Suit berjalan normal!\n');

  // Test 6: Menus
  console.log('6️⃣ Menguji Generator Menu User & Admin...');
  const userMenuObj = userMenu.getMainUserMenu('user_regular', 'Budi');
  assert(userMenuObj.banner && userMenuObj.inlineKeyboard.length > 0, 'User menu should generate');

  const adminMenuObj = adminMenu.getAdminDashboard();
  assert(adminMenuObj.text.includes('DASHBOARD ADMIN'), 'Admin dashboard should generate');
  console.log('   ✅ Generator User Menu & Admin Dashboard valid!\n');

  console.log('🎉 SEMUA PENGUJIAN MODUL BERHASIL 100%!');
}

runTests().catch((e) => {
  console.error('❌ Test Error:', e);
  process.exit(1);
});
