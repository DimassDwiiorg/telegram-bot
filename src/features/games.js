// Batas waktu sesi game aktif sebelum dianggap kedaluwarsa (5 menit)
const GAME_TIMEOUT_MS = 5 * 60 * 1000;

// In-memory sessions for active guessing games
const activeNumberGames = new Map(); // userId -> { target, attempts, startTime }
const activeQuizGames = new Map();   // userId -> { q, a, hint, startTime }
const activeWordGames = new Map();   // userId -> { word, hint, scrambled, attempts, startTime }
const activeMathGames = new Map();   // userId -> { answer, startTime }

const RIDDLES = [
  { q: "Makin diisi, makin ringan. Apakah itu?", a: "balon", hint: "Sering ada di pesta ulang tahun" },
  { q: "Punya mata tapi tidak bisa melihat, punya gigi tapi tidak bisa menggigit. Apakah itu?", a: "sisir", hint: "Dipakai merapikan rambut" },
  { q: "Kue apa yang bungkusnya di dalam, isinya di luar?", a: "kue salah bikin", hint: "Jawaban plesetan humor" },
  { q: "Benda apa yang kalau dipotong malah bertambah panjang?", a: "kacang panjang", hint: "Sayuran berwarna hijau" },
  { q: "Pintu apa yang didorong oleh 10 orang pun tidak mau terbuka?", a: "pintu geser", hint: "Cara membukanya bukan didorong ke depan" },
  { q: "Bisa dipegang tapi tidak bisa disentuh langsung, kalau hilang dicari-cari. Apakah itu?", a: "bayangan", hint: "Mengikuti ke mana saja ada cahaya" },
  { q: "Punya daun tapi bukan pohon, punya punggung tapi tak bertulang. Apakah itu?", a: "buku", hint: "Tempat membaca ilmu" },
  { q: "Hewan apa yang paling hening dan pendiam?", a: "semut", hint: "Karena kalau berisik namanya semut-ter" }
];

const WORDS = [
  { word: "kucing", hint: "Hewan peliharaan yang suka mengeong" },
  { word: "telegram", hint: "Aplikasi chatting yang sedang kamu pakai sekarang" },
  { word: "matahari", hint: "Pusat tata surya kita, terbit dari timur" },
  { word: "komputer", hint: "Alat elektronik untuk mengetik dan browsing" },
  { word: "indonesia", hint: "Negara kepulauan terbesar di dunia" },
  { word: "sepakbola", hint: "Olahraga paling populer sedunia, main pakai bola bundar" },
  { word: "gitar", hint: "Alat musik berdawai, sering dipetik" },
  { word: "bintang", hint: "Bersinar terang di langit malam" },
  { word: "perpustakaan", hint: "Tempat menyimpan dan meminjam banyak buku" },
  { word: "keyboard", hint: "Alat untuk mengetik di komputer atau HP" },
  { word: "jendela", hint: "Bagian rumah untuk melihat keluar dan biar ada cahaya masuk" },
  { word: "payung", hint: "Dipakai supaya tidak basah saat hujan" }
];

function isExpired(session) {
  return session && (Date.now() - session.startTime) > GAME_TIMEOUT_MS;
}

// ==========================================
// GAME: TEBAK ANGKA (1-100)
// ==========================================
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
  const game = activeNumberGames.get(String(userId));
  if (isExpired(game)) {
    activeNumberGames.delete(String(userId));
    return null;
  }
  return game;
}

function stopNumberGame(userId) {
  activeNumberGames.delete(String(userId));
}

function processNumberGuess(userId, guess) {
  const game = getNumberGame(userId);
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

// ==========================================
// GAME: KUIS TEBAK-TEBAKAN
// ==========================================
function getRandomRiddle(userId) {
  const item = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  activeQuizGames.set(String(userId), { ...item, startTime: Date.now() });
  return item;
}

function getActiveRiddle(userId) {
  const quiz = activeQuizGames.get(String(userId));
  if (isExpired(quiz)) {
    activeQuizGames.delete(String(userId));
    return null;
  }
  return quiz;
}

function stopRiddle(userId) {
  activeQuizGames.delete(String(userId));
}

function answerRiddle(userId, answer) {
  const quiz = getActiveRiddle(userId);
  if (!quiz) return null;

  const cleanAns = String(answer).trim().toLowerCase();
  const targetAns = quiz.a.toLowerCase();

  if (cleanAns.includes(targetAns) || targetAns.includes(cleanAns)) {
    activeQuizGames.delete(String(userId));
    return { success: true, answer: quiz.a };
  }
  return { success: false, hint: quiz.hint };
}

// ==========================================
// GAME: TEBAK KATA (ACAK KATA)
// ==========================================
function scrambleWord(word) {
  const arr = word.split('');
  let scrambled = word;
  let tries = 0;
  // Ulang acak sampai hasilnya benar-benar berbeda dari kata asli
  while (scrambled === word && tries < 10) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join('');
    tries += 1;
  }
  return scrambled;
}

function startWordGame(userId) {
  const item = WORDS[Math.floor(Math.random() * WORDS.length)];
  const scrambled = scrambleWord(item.word);
  activeWordGames.set(String(userId), {
    word: item.word,
    hint: item.hint,
    scrambled,
    attempts: 0,
    startTime: Date.now()
  });
  return { scrambled, hint: item.hint };
}

function getWordGame(userId) {
  const game = activeWordGames.get(String(userId));
  if (isExpired(game)) {
    activeWordGames.delete(String(userId));
    return null;
  }
  return game;
}

function stopWordGame(userId) {
  activeWordGames.delete(String(userId));
}

function answerWordGame(userId, answer) {
  const game = getWordGame(userId);
  if (!game) return null;

  game.attempts += 1;
  const clean = String(answer).trim().toLowerCase();

  if (clean === game.word) {
    activeWordGames.delete(String(userId));
    return { success: true, word: game.word, attempts: game.attempts };
  }
  return { success: false, attempts: game.attempts, hint: game.hint };
}

// ==========================================
// GAME: HITUNG CEPAT (MATH SPRINT)
// ==========================================
function generateMathQuestion() {
  const ops = ['+', '-', 'x'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  if (op === 'x') {
    a = Math.floor(Math.random() * 12) + 1;
    b = Math.floor(Math.random() * 12) + 1;
    answer = a * b;
  } else if (op === '+') {
    a = Math.floor(Math.random() * 90) + 10;
    b = Math.floor(Math.random() * 90) + 10;
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 90) + 10;
    b = Math.floor(Math.random() * a) + 1; // Hindari hasil negatif
    answer = a - b;
  }

  return { question: `${a} ${op} ${b}`, answer };
}

function startMathGame(userId) {
  const q = generateMathQuestion();
  activeMathGames.set(String(userId), {
    answer: q.answer,
    startTime: Date.now()
  });
  return q.question;
}

function getMathGame(userId) {
  const game = activeMathGames.get(String(userId));
  if (isExpired(game)) {
    activeMathGames.delete(String(userId));
    return null;
  }
  return game;
}

function stopMathGame(userId) {
  activeMathGames.delete(String(userId));
}

function answerMathGame(userId, answer) {
  const game = getMathGame(userId);
  if (!game) return null;

  const num = parseInt(String(answer).trim(), 10);
  const elapsedSeconds = ((Date.now() - game.startTime) / 1000).toFixed(1);
  activeMathGames.delete(String(userId));

  if (!isNaN(num) && num === game.answer) {
    return { success: true, elapsedSeconds };
  }
  return { success: false, correctAnswer: game.answer };
}

// ==========================================
// UTIL: HENTIKAN SEMUA GAME AKTIF MILIK USER
// ==========================================
function clearAllGames(userId) {
  const id = String(userId);
  activeNumberGames.delete(id);
  activeQuizGames.delete(id);
  activeWordGames.delete(id);
  activeMathGames.delete(id);
}

function hasActiveGame(userId) {
  return Boolean(getNumberGame(userId) || getActiveRiddle(userId) || getWordGame(userId) || getMathGame(userId));
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
  GAME_TIMEOUT_MS,
  startNumberGame,
  getNumberGame,
  stopNumberGame,
  processNumberGuess,
  getRandomRiddle,
  getActiveRiddle,
  stopRiddle,
  answerRiddle,
  startWordGame,
  getWordGame,
  stopWordGame,
  answerWordGame,
  startMathGame,
  getMathGame,
  stopMathGame,
  answerMathGame,
  clearAllGames,
  hasActiveGame,
  playSuit
};
