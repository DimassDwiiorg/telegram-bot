// In-memory sessions for active guessing games
const activeNumberGames = new Map(); // userId -> { target, attempts, startTime }
const activeQuizGames = new Map();   // userId -> { question, answer, hint }

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
  startNumberGame,
  getNumberGame,
  stopNumberGame,
  processNumberGuess,
  getRandomRiddle,
  getActiveRiddle,
  answerRiddle,
  playSuit
};
