// In-memory sessions for active games
const activeNumberGames = new Map(); // userId -> { target, attempts, startTime }
const activeQuizGames = new Map();   // userId -> { question, answer, hint }
const activeMathGames = new Map();   // userId -> { problem, answer, startTime }
const activeWordGames = new Map();   // userId -> { word, guessed, wrong, maxWrong }
const activeTTTGames = new Map();    // userId -> { board, playerMark, botMark }

const RIDDLES = [
  { q: "Makin diisi, makin ringan. Apakah itu?", a: "balon", hint: "Sering ada di pesta ulang tahun" },
  { q: "Punya mata tapi tidak bisa melihat, punya gigi tapi tidak bisa menggigit. Apakah itu?", a: "sisir", hint: "Dipakai merapikan rambut" },
  { q: "Kue apa yang bungkusnya di dalam, isinya di luar?", a: "kue salah bikin", hint: "Jawaban plesetan humor" },
  { q: "Benda apa yang kalau dipotong malah bertambah panjang?", a: "kacang panjang", hint: "Sayuran berwarna hijau" },
  { q: "Pintu apa yang didorong oleh 10 orang pun tidak mau terbuka?", a: "pintu geser", hint: "Cara membukanya bukan didorong ke depan" },
  { q: "Bisa dipegang tapi tidak bisa disentuh langsung, kalau hilang dicari-cari. Apakah itu?", a: "bayangan", hint: "Mengikuti ke mana saja ada cahaya" },
  { q: "Punya daun tapi bukan pohon, punya punggung tapi tak bertulang. Apakah itu?", a: "buku", hint: "Tempat membaca ilmu" },
  { q: "Hewan apa yang paling hening dan pendiam?", a: "semut", hint: "Karena kalau berisik namanya semut-ter" },
  { q: "Apa yang punya kaki tapi tidak bisa jalan?", a: "meja", hint: "Tempat meletakkan barang" },
  { q: "Semakin kamu ambil, semakin banyak yang tertinggal. Apakah itu?", a: "langkah", hint: "Dilakukan saat berjalan" },
  { q: "Apa yang selalu datang tapi tidak pernah benar-benar tiba?", a: "besok", hint: "Hari setelah hari ini" },
  { q: "Benda apa yang kalau di jatuhkan tidak pernah basah?", a: "bayangan", hint: "Bukan benda fisik" },
  { q: "Bus apa yang bisa terbang?", a: "airbus", hint: "Merek pesawat terbang" },
  { q: "Nasi apa yang tidak bisa dimakan?", a: "nasib", hint: "Berkaitan dengan takdir" },
  { q: "Kenapa kucing kalau difoto selalu merem?", a: "karena pake flash", hint: "Berhubungan dengan cahaya kamera" },
  { q: "Apa bedanya kucing sama kucring?", a: "kalau kucing kakinya 4 kalau kucring kakinya keseleo", hint: "Plesetan huruf" },
  { q: "Rambut apa yang bisa masak?", a: "rambutan", hint: "Buah berwarna merah berbulu" },
  { q: "Monyet apa yang menakutkan?", a: "monyet berbulu harimau", hint: "Hewan berkombinasi" },
  { q: "Kenapa Superman bajunya ketat?", a: "karena pakainya ukuran S", hint: "Berhubungan dengan huruf depan namanya" },
  { q: "Jam berapa delman berhenti?", a: "jambret", hint: "Plesetan kata jam + sesuatu" }
];

// ===========================
// TRIVIA QUIZ (Multi-Category)
// ===========================
const TRIVIA_DB = [
  { q: "Planet apa yang paling besar di tata surya?", a: "jupiter", category: "🌍 Sains", hint: "Planet kelima dari matahari" },
  { q: "Siapa penemu lampu pijar?", a: "thomas edison", category: "🔬 Sains", hint: "Ilmuwan Amerika terkenal" },
  { q: "Apa ibukota Jepang?", a: "tokyo", category: "🌏 Geografi", hint: "Kota metropolitan terbesar di dunia" },
  { q: "Berapa jumlah surat dalam Al-Quran?", a: "114", category: "🕌 Agama", hint: "Lebih dari seratus" },
  { q: "Hewan apa yang paling cepat di darat?", a: "cheetah", category: "🐾 Hewan", hint: "Kucing besar dari Afrika" },
  { q: "Siapa presiden pertama Indonesia?", a: "soekarno", category: "📚 Sejarah", hint: "Bapak proklamator" },
  { q: "Apa rumus kimia air?", a: "h2o", category: "🔬 Sains", hint: "2 hidrogen 1 oksigen" },
  { q: "Gunung tertinggi di dunia?", a: "everest", category: "🌏 Geografi", hint: "Terletak di perbatasan Nepal-China" },
  { q: "Berapa jumlah provinsi di Indonesia (2024)?", a: "38", category: "🌏 Geografi", hint: "Lebih dari 35" },
  { q: "Apa bahasa pemrograman yang dibuat oleh Guido van Rossum?", a: "python", category: "💻 Teknologi", hint: "Nama ular" },
  { q: "Siapa pencipta Facebook?", a: "mark zuckerberg", category: "💻 Teknologi", hint: "CEO Meta" },
  { q: "Apa nama satelit alami bumi?", a: "bulan", category: "🌍 Sains", hint: "Terlihat di malam hari" },
  { q: "Benua apa yang paling kecil?", a: "australia", category: "🌏 Geografi", hint: "Juga merupakan negara" },
  { q: "Sungai terpanjang di dunia?", a: "nil", category: "🌏 Geografi", hint: "Mengalir di benua Afrika" },
  { q: "Apa nama kitab suci umat Islam?", a: "al-quran", category: "🕌 Agama", hint: "Diturunkan kepada Nabi Muhammad SAW" },
  { q: "Berapa jumlah Nabi dan Rasul yang wajib diketahui?", a: "25", category: "🕌 Agama", hint: "Dua puluh lima" },
  { q: "Organ tubuh manusia yang paling besar?", a: "kulit", category: "🔬 Sains", hint: "Menutupi seluruh tubuh" },
  { q: "Siapa penemu telepon?", a: "alexander graham bell", category: "📚 Sejarah", hint: "Nama depannya Alexander" },
  { q: "Apa nama mata uang Jepang?", a: "yen", category: "🌏 Geografi", hint: "Tiga huruf" },
  { q: "Berapa derajat sudut dalam segitiga?", a: "180", category: "🔢 Matematika", hint: "Kelipatan 60" },
];

// ===========================
// COIN FLIP
// ===========================
function flipCoin() {
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const emoji = result === 'heads' ? '🪙' : '💰';
  const indo = result === 'heads' ? 'KEPALA (Heads)' : 'EKOR (Tails)';
  return { result, emoji, indo };
}

// ===========================
// MAGIC 8-BALL
// ===========================
const MAGIC_8BALL_RESPONSES = [
  { text: "✅ Ya, pasti!", type: "positive" },
  { text: "✅ Sudah dipastikan begitu.", type: "positive" },
  { text: "✅ Tanpa keraguan.", type: "positive" },
  { text: "✅ Jelas sekali iya.", type: "positive" },
  { text: "✅ Kamu bisa mengandalkan itu.", type: "positive" },
  { text: "✅ Sejauh yang kulihat, ya.", type: "positive" },
  { text: "✅ Kemungkinan besar iya.", type: "positive" },
  { text: "✅ Prospeknya bagus.", type: "positive" },
  { text: "✅ Tanda-tandanya mengatakan ya.", type: "positive" },
  { text: "🔮 Jawaban masih kabur, coba lagi.", type: "neutral" },
  { text: "🔮 Tanyakan lagi nanti.", type: "neutral" },
  { text: "🔮 Lebih baik tidak diceritakan sekarang.", type: "neutral" },
  { text: "🔮 Belum bisa diprediksi sekarang.", type: "neutral" },
  { text: "🔮 Konsentrasilah dan tanyakan lagi.", type: "neutral" },
  { text: "❌ Jangan berharap terlalu banyak.", type: "negative" },
  { text: "❌ Jawaban saya adalah tidak.", type: "negative" },
  { text: "❌ Sumber saya mengatakan tidak.", type: "negative" },
  { text: "❌ Prospeknya kurang bagus.", type: "negative" },
  { text: "❌ Sangat diragukan.", type: "negative" },
  { text: "❌ Hmm... sepertinya tidak.", type: "negative" }
];

function magic8Ball() {
  return MAGIC_8BALL_RESPONSES[Math.floor(Math.random() * MAGIC_8BALL_RESPONSES.length)];
}

// ===========================
// TRUTH OR DARE
// ===========================
const TRUTHS = [
  "Apa hal paling memalukan yang pernah kamu alami?",
  "Siapa orang terakhir yang kamu stalking di media sosial?",
  "Apa kebohongan terakhir yang kamu katakan?",
  "Kalau bisa mengulang 1 hari dalam hidupmu, hari apa itu?",
  "Apa rahasia yang belum pernah kamu ceritakan ke siapapun?",
  "Siapa crush pertamamu?",
  "Apa kebiasaan aneh yang kamu punya?",
  "Pernahkah kamu menangis karena film? Film apa?",
  "Apa hal terbodoh yang pernah kamu lakukan?",
  "Kalau besok dunia kiamat, apa yang kamu lakukan hari ini?",
  "Apa yang kamu lakukan saat sendirian di rumah?",
  "Siapa yang paling sering kamu chat?",
  "Pernah nggak kamu baca chat orang lain diam-diam?",
  "Apa makanan yang paling kamu benci?",
  "Kalau jadi invisible 1 hari, kamu mau ngapain?",
];

const DARES = [
  "Kirim selfie sekarang juga tanpa filter!",
  "Screenshoot percakapan terakhirmu dan kirim di sini!",
  "Tulis status WhatsApp 'Saya ganteng/cantik sekali' selama 1 jam!",
  "Chat mantan kamu sekarang dan bilang 'Hai, apa kabar?'",
  "Nyanyi satu bait lagu dan kirim voice note!",
  "Ganti foto profil dengan foto paling jelek selama 1 jam!",
  "Telepon orang terakhir di log panggilan dan bilang 'I love you'!",
  "Kirim emoji 🤡 ke 3 grup terakhir yang kamu chat!",
  "Tulis puisi 4 baris dan kirim di sini!",
  "Push-up 10 kali sekarang dan kirim buktinya!",
  "Ceritakan lelucon dan buat semua orang tertawa!",
  "Tirukan gaya bicara guru/dosen favoritmu lewat VN!",
  "Kirim chat 'Aku kangen kamu' ke kontak nomor 7 di HP!",
  "Buat pantun dan share di sini sekarang!",
  "Foto makanan/minuman terdekat dan kirim di sini!",
];

function getRandomTruth() {
  return TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
}

function getRandomDare() {
  return DARES[Math.floor(Math.random() * DARES.length)];
}

// ===========================
// WOULD YOU RATHER
// ===========================
const WOULD_YOU_RATHER = [
  { a: "Bisa terbang", b: "Bisa membaca pikiran orang" },
  { a: "Jadi orang paling pintar", b: "Jadi orang paling kaya" },
  { a: "Hidup tanpa musik", b: "Hidup tanpa film" },
  { a: "Bisa bicara semua bahasa", b: "Bisa bicara dengan hewan" },
  { a: "Selalu bilang jujur", b: "Selalu berbohong" },
  { a: "Punya waktu tanpa batas", b: "Punya uang tanpa batas" },
  { a: "Tinggal di kutub utara", b: "Tinggal di gurun pasir" },
  { a: "Hidup di masa lalu", b: "Hidup di masa depan" },
  { a: "Jadi superhero terkenal", b: "Jadi superhero anonim" },
  { a: "Tidak pernah makan coklat lagi", b: "Tidak pernah makan keju lagi" },
  { a: "Kehilangan semua uang", b: "Kehilangan semua foto" },
  { a: "Punya kekuatan super strength", b: "Punya kekuatan super speed" },
  { a: "Tinggal di kota besar selamanya", b: "Tinggal di desa selamanya" },
  { a: "Selalu hujan di sekitarmu", b: "Selalu panas terik di sekitarmu" },
  { a: "Jadi presiden 1 hari", b: "Jadi artis terkenal 1 hari" },
];

function getRandomWouldYouRather() {
  return WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
}

// ===========================
// MATH CHALLENGE (Timed)
// ===========================
function startMathChallenge(userId) {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;
  
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 100) + 10;
      b = Math.floor(Math.random() * 100) + 10;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 100) + 50;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * 20) + 2;
      b = Math.floor(Math.random() * 15) + 2;
      answer = a * b;
      break;
  }
  
  const problem = `${a} ${op} ${b}`;
  activeMathGames.set(String(userId), {
    problem,
    answer,
    startTime: Date.now()
  });
  
  return { problem, answer };
}

function getMathGame(userId) {
  return activeMathGames.get(String(userId));
}

function processMathAnswer(userId, input) {
  const game = activeMathGames.get(String(userId));
  if (!game) return null;
  
  const num = parseInt(input, 10);
  if (isNaN(num)) return { correct: false, message: '⚠️ Masukkan angka yang valid!' };
  
  const elapsed = ((Date.now() - game.startTime) / 1000).toFixed(1);
  
  if (num === game.answer) {
    activeMathGames.delete(String(userId));
    return {
      correct: true,
      answer: game.answer,
      time: elapsed,
      message: `🎉 *BENAR! Jawaban: ${game.answer}*\n⏱️ Waktu: ${elapsed} detik`
    };
  } else {
    activeMathGames.delete(String(userId));
    return {
      correct: false,
      answer: game.answer,
      time: elapsed,
      message: `❌ *Salah!* Jawaban yang benar: *${game.answer}*\n⏱️ Waktu: ${elapsed} detik`
    };
  }
}

// ===========================
// TEBAK KATA (Hangman-style)
// ===========================
const WORDS_DB = [
  { word: "INDONESIA", hint: "Negara kepulauan terbesar" },
  { word: "MERDEKA", hint: "17 Agustus 1945" },
  { word: "PANCASILA", hint: "Dasar negara Indonesia" },
  { word: "KOMPUTER", hint: "Alat elektronik untuk mengolah data" },
  { word: "ASTRONAUT", hint: "Orang yang pergi ke luar angkasa" },
  { word: "TELESKOP", hint: "Alat untuk melihat bintang" },
  { word: "DINOSAURUS", hint: "Hewan purba yang sudah punah" },
  { word: "PIRAMIDA", hint: "Bangunan kuno di Mesir" },
  { word: "GERHANA", hint: "Fenomena alam saat matahari/bulan tertutup" },
  { word: "TELEGRAM", hint: "Aplikasi chat yang sedang kamu gunakan" },
  { word: "KURIKULUM", hint: "Rencana pembelajaran di sekolah" },
  { word: "FOTOSINTESIS", hint: "Proses tumbuhan membuat makanan" },
  { word: "GRAVITASI", hint: "Gaya tarik bumi" },
  { word: "DEMOKRASI", hint: "Sistem pemerintahan dari rakyat" },
  { word: "METAMORFOSIS", hint: "Perubahan bentuk pada hewan" },
];

function startWordGame(userId) {
  const item = WORDS_DB[Math.floor(Math.random() * WORDS_DB.length)];
  const gameState = {
    word: item.word.toUpperCase(),
    hint: item.hint,
    guessed: new Set(),
    wrong: 0,
    maxWrong: 6
  };
  activeWordGames.set(String(userId), gameState);
  return gameState;
}

function getWordGame(userId) {
  return activeWordGames.get(String(userId));
}

function getWordDisplay(game) {
  return game.word.split('').map(ch => {
    if (ch === ' ') return '  ';
    return game.guessed.has(ch) ? ch : '_';
  }).join(' ');
}

function processWordGuess(userId, letter) {
  const game = activeWordGames.get(String(userId));
  if (!game) return null;
  
  const char = letter.toUpperCase().charAt(0);
  
  if (!/[A-Z]/.test(char)) {
    return { status: 'invalid', message: '⚠️ Masukkan satu huruf A-Z!' };
  }
  
  if (game.guessed.has(char)) {
    return { status: 'duplicate', message: `⚠️ Huruf *${char}* sudah pernah ditebak!` };
  }
  
  game.guessed.add(char);
  
  if (!game.word.includes(char)) {
    game.wrong++;
    
    if (game.wrong >= game.maxWrong) {
      activeWordGames.delete(String(userId));
      return {
        status: 'lose',
        word: game.word,
        message: `💀 *GAME OVER!*\n\n❌ Nyawa habis! Kata yang benar: *${game.word}*\n📌 _${game.hint}_`
      };
    }
    
    const display = getWordDisplay(game);
    const hearts = '❤️'.repeat(game.maxWrong - game.wrong) + '🖤'.repeat(game.wrong);
    return {
      status: 'wrong',
      display,
      hearts,
      message: `❌ Huruf *${char}* tidak ada!\n\n📝 ${display}\n${hearts} (${game.maxWrong - game.wrong} nyawa tersisa)\n💡 _${game.hint}_`
    };
  }
  
  // Check if all letters guessed
  const allGuessed = game.word.split('').every(ch => ch === ' ' || game.guessed.has(ch));
  const display = getWordDisplay(game);
  const hearts = '❤️'.repeat(game.maxWrong - game.wrong) + '🖤'.repeat(game.wrong);
  
  if (allGuessed) {
    activeWordGames.delete(String(userId));
    return {
      status: 'win',
      word: game.word,
      message: `🎉 *SELAMAT! KAMU BERHASIL!*\n\n✅ Kata: *${game.word}*\n📌 _${game.hint}_\n❤️ Nyawa tersisa: ${game.maxWrong - game.wrong}`
    };
  }
  
  return {
    status: 'correct',
    display,
    hearts,
    message: `✅ Huruf *${char}* benar!\n\n📝 ${display}\n${hearts}\n💡 _${game.hint}_`
  };
}

// ===========================
// TRIVIA QUIZ
// ===========================
function getRandomTrivia(userId) {
  const item = TRIVIA_DB[Math.floor(Math.random() * TRIVIA_DB.length)];
  activeQuizGames.set(String(userId), { q: item.q, a: item.a, hint: item.hint, category: item.category });
  return item;
}

// ===========================
// EMOJI CHAIN GAME
// ===========================
const EMOJI_PUZZLES = [
  { emoji: "🎮🕹️👾", answer: "game", hint: "Aktivitas bermain" },
  { emoji: "🍕🧀🫓", answer: "pizza", hint: "Makanan Italia" },
  { emoji: "🏫📚✏️", answer: "sekolah", hint: "Tempat belajar" },
  { emoji: "🎵🎤🎶", answer: "musik", hint: "Seni suara" },
  { emoji: "⚽🥅🏃", answer: "sepakbola", hint: "Olahraga paling populer" },
  { emoji: "🌊🏄🐠", answer: "laut", hint: "Kumpulan air asin yang luas" },
  { emoji: "🌙⭐🌌", answer: "malam", hint: "Waktu gelap" },
  { emoji: "☕🫖🍩", answer: "ngopi", hint: "Aktivitas santai dengan minuman" },
  { emoji: "🎬🍿🎥", answer: "bioskop", hint: "Tempat nonton film" },
  { emoji: "✈️🧳🌍", answer: "traveling", hint: "Kegiatan jalan-jalan" },
  { emoji: "📱💬🔔", answer: "chat", hint: "Berkomunikasi lewat pesan" },
  { emoji: "🍚🥢🍣", answer: "sushi", hint: "Makanan Jepang" },
  { emoji: "🎂🎁🎈", answer: "ulang tahun", hint: "Perayaan tahunan" },
  { emoji: "🌧️☔💧", answer: "hujan", hint: "Air dari langit" },
  { emoji: "🏠🔑🚪", answer: "rumah", hint: "Tempat tinggal" },
];

function getRandomEmojiPuzzle(userId) {
  const item = EMOJI_PUZZLES[Math.floor(Math.random() * EMOJI_PUZZLES.length)];
  activeQuizGames.set(String(userId), { q: item.emoji, a: item.answer, hint: item.hint, isEmoji: true });
  return item;
}

// ===========================
// LUCKY NUMBER
// ===========================
function getLuckyNumber() {
  const lucky = Math.floor(Math.random() * 100) + 1;
  let meaning = '';
  if (lucky <= 20) meaning = '😟 Kurang beruntung hari ini. Tetap semangat!';
  else if (lucky <= 40) meaning = '😊 Lumayan beruntung. Terus berusaha!';
  else if (lucky <= 60) meaning = '🎯 Cukup beruntung! Hari yang bagus.';
  else if (lucky <= 80) meaning = '🌟 Sangat beruntung! Manfaatkan harimu!';
  else meaning = '🎉 SUPER LUCKY! Hari keberuntunganmu!';
  return { number: lucky, meaning };
}

// ===========================
// DAILY HOROSCOPE
// ===========================
const HOROSCOPE_MSGS = {
  aries: { emoji: '♈', name: 'Aries', period: '21 Mar - 19 Apr' },
  taurus: { emoji: '♉', name: 'Taurus', period: '20 Apr - 20 Mei' },
  gemini: { emoji: '♊', name: 'Gemini', period: '21 Mei - 20 Jun' },
  cancer: { emoji: '♋', name: 'Cancer', period: '21 Jun - 22 Jul' },
  leo: { emoji: '♌', name: 'Leo', period: '23 Jul - 22 Agu' },
  virgo: { emoji: '♍', name: 'Virgo', period: '23 Agu - 22 Sep' },
  libra: { emoji: '♎', name: 'Libra', period: '23 Sep - 22 Okt' },
  scorpio: { emoji: '♏', name: 'Scorpio', period: '23 Okt - 21 Nov' },
  sagittarius: { emoji: '♐', name: 'Sagittarius', period: '22 Nov - 21 Des' },
  capricorn: { emoji: '♑', name: 'Capricorn', period: '22 Des - 19 Jan' },
  aquarius: { emoji: '♒', name: 'Aquarius', period: '20 Jan - 18 Feb' },
  pisces: { emoji: '♓', name: 'Pisces', period: '19 Feb - 20 Mar' },
};

const FORTUNES = [
  "Hari ini energimu sedang tinggi! Gunakan untuk menyelesaikan hal-hal yang tertunda.",
  "Ada kejutan manis menunggumu hari ini. Stay positive!",
  "Berhati-hatilah dengan keputusan finansial. Pikirkan dua kali sebelum berbelanja.",
  "Hubungan sosialmu sedang sangat baik. Manfaatkan untuk networking!",
  "Waktunya fokus pada diri sendiri. Self-care is not selfish!",
  "Kreativitasmu sedang peak! Tulis ide-idemu sekarang.",
  "Kesabaran adalah kunci hari ini. Jangan terburu-buru.",
  "Seseorang dari masa lalu mungkin menghubungimu. Be open!",
  "Hari yang tepat untuk memulai proyek baru!",
  "Jaga kesehatanmu hari ini. Minum air yang cukup!",
];

function getHoroscope(zodiac) {
  const z = zodiac.toLowerCase();
  const data = HOROSCOPE_MSGS[z];
  if (!data) return null;
  const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  const love = Math.floor(Math.random() * 5) + 1;
  const career = Math.floor(Math.random() * 5) + 1;
  const health = Math.floor(Math.random() * 5) + 1;
  const luck = Math.floor(Math.random() * 100) + 1;
  return { ...data, fortune, love, career, health, luck };
}

// ===========================
// EXISTING FUNCTIONS (Original)
// ===========================
function startNumberGame(userId) {
  const target = Math.floor(Math.random() * 100) + 1;
  activeNumberGames.set(String(userId), {
    target,
    attempts: 0,
    startTime: Date.now()
  });
  return target;
}

function getNumberGame(userId) {
  return activeNumberGames.get(String(userId));
}

function stopNumberGame(userId) {
  activeNumberGames.delete(String(userId));
}

function processNumberGuess(userId, guess) {
  const game = activeNumberGames.get(String(userId));
  if (!game) return null;

  const num = parseInt(guess, 10);
  if (isNaN(num)) {
    return { status: 'invalid', message: '⚠️ Masukkan angka yang valid antara 1 - 100!' };
  }

  game.attempts += 1;

  if (num === game.target) {
    activeNumberGames.delete(String(userId));
    return {
      status: 'win',
      target: game.target,
      attempts: game.attempts,
      message: `🎉 *SELAMAT! TEBAKANMU BENAR!*\n\n🎯 Angka rahasia: *${game.target}*\n🔢 Total percobaan: *${game.attempts} kali*\n\nKamu hebat!`
    };
  } else if (num < game.target) {
    return {
      status: 'higher',
      attempts: game.attempts,
      message: `🔼 *Terlalu KECIL!*\n\nAngka rahasia lebih *BESAR* dari *${num}*.\nPercobaan ke: ${game.attempts}. Coba tebak lagi!`
    };
  } else {
    return {
      status: 'lower',
      attempts: game.attempts,
      message: `🔽 *Terlalu BESAR!*\n\nAngka rahasia lebih *KECIL* dari *${num}*.\nPercobaan ke: ${game.attempts}. Coba tebak lagi!`
    };
  }
}

function getRandomRiddle(userId) {
  const item = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  activeQuizGames.set(String(userId), item);
  return item;
}

function getActiveRiddle(userId) {
  return activeQuizGames.get(String(userId));
}

function answerRiddle(userId, answer) {
  const quiz = activeQuizGames.get(String(userId));
  if (!quiz) return null;

  const cleanAns = String(answer).trim().toLowerCase();
  const targetAns = quiz.a.toLowerCase();

  if (cleanAns.includes(targetAns) || targetAns.includes(cleanAns)) {
    activeQuizGames.delete(String(userId));
    return { success: true, answer: quiz.a };
  }
  return { success: false, hint: quiz.hint };
}

// Suit: Batu, Gunting, Kertas
function playSuit(userChoice) {
  const choices = ['batu', 'gunting', 'kertas'];
  const emojis = { batu: '✊ Batu', gunting: '✌️ Gunting', kertas: '✋ Kertas' };
  const botChoice = choices[Math.floor(Math.random() * choices.length)];

  let result = 'draw';
  if (userChoice === botChoice) {
    result = 'draw';
  } else if (
    (userChoice === 'batu' && botChoice === 'gunting') ||
    (userChoice === 'gunting' && botChoice === 'kertas') ||
    (userChoice === 'kertas' && botChoice === 'batu')
  ) {
    result = 'win';
  } else {
    result = 'lose';
  }

  return {
    userChoice: emojis[userChoice],
    botChoice: emojis[botChoice],
    result
  };
}

module.exports = {
  // Original
  startNumberGame,
  getNumberGame,
  stopNumberGame,
  processNumberGuess,
  getRandomRiddle,
  getActiveRiddle,
  answerRiddle,
  playSuit,
  // New Games
  flipCoin,
  magic8Ball,
  getRandomTruth,
  getRandomDare,
  getRandomWouldYouRather,
  startMathChallenge,
  getMathGame,
  processMathAnswer,
  startWordGame,
  getWordGame,
  getWordDisplay,
  processWordGuess,
  getRandomTrivia,
  getRandomEmojiPuzzle,
  getLuckyNumber,
  getHoroscope,
  HOROSCOPE_MSGS,
};
