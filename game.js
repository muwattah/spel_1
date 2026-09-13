/**
 * Sequence Pulse – Spel 1
 * Completely different game: Simon-style memory sequence
 * Psychological hooks:
 * - Variable ratio rewards (random bonus multipliers on perfect runs)
 * - Flow (sequence length & speed ramp gradually)
 * - Compulsion loop (watch → repeat → reward → longer sequence)
 * - Juicy feedback (flashes, messages, score pops)
 * - Near-miss (fail on last note → special message)
 * - Visible progress + streak
 */

const padContainer = document.getElementById('pad-container');
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const streakDisplay = document.getElementById('streak-display');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const statusMsg = document.getElementById('status-msg');
const livesDisplay = document.getElementById('lives-display');

const overlay = document.getElementById('overlay');
const levelComplete = document.getElementById('level-complete');
const gameOverScreen = document.getElementById('game-over');
const winScreen = document.getElementById('win-screen');
const levelStats = document.getElementById('level-stats');
const finalScoreEl = document.getElementById('final-score');
const winScoreEl = document.getElementById('win-score');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const retryBtn = document.getElementById('retry-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// 10 levels – progressive difficulty
// padCount, seqLength start, roundsToClear, speed (ms between lights), lives
const LEVELS = [
  { pads: 4, startLen: 3, rounds: 3, speed: 700, lives: 3 },  // 1
  { pads: 4, startLen: 3, rounds: 3, speed: 620, lives: 3 },  // 2
  { pads: 4, startLen: 4, rounds: 3, speed: 560, lives: 3 },  // 3
  { pads: 4, startLen: 4, rounds: 4, speed: 500, lives: 3 },  // 4
  { pads: 4, startLen: 5, rounds: 4, speed: 450, lives: 3 },  // 5
  { pads: 6, startLen: 4, rounds: 4, speed: 480, lives: 3 },  // 6 more pads
  { pads: 6, startLen: 5, rounds: 4, speed: 420, lives: 3 },  // 7
  { pads: 6, startLen: 6, rounds: 4, speed: 380, lives: 2 },  // 8
  { pads: 9, startLen: 5, rounds: 4, speed: 400, lives: 2 },  // 9 3x3
  { pads: 9, startLen: 6, rounds: 5, speed: 340, lives: 2 }   // 10 finale
];

let currentLevel = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let roundsDone = 0;
let lives = 3;
let sequence = [];
let playerStep = 0;
let isPlayingSequence = false;
let isPlayerTurn = false;
let pads = [];
let currentSeqLen = 3;

function setMessage(text, color = '#e0d4ff') {
  statusMsg.textContent = text;
  statusMsg.style.color = color;
}

function updateUI() {
  levelDisplay.textContent = currentLevel + 1;
  scoreDisplay.textContent = score;
  streakDisplay.textContent = streak;
  const cfg = LEVELS[currentLevel];
  const pct = Math.min(100, (roundsDone / cfg.rounds) * 100);
  progressBar.style.width = pct + '%';
  progressText.textContent = `${roundsDone} / ${cfg.rounds}`;
  livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives)) + (lives < cfg.lives ? '🖤'.repeat(cfg.lives - lives) : '');
}

function createPads(count) {
  padContainer.innerHTML = '';
  pads = [];
  padContainer.style.gridTemplateColumns = count <= 4 ? '1fr 1fr' : count <= 6 ? '1fr 1fr 1fr' : '1fr 1fr 1fr';

  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = `pad pad-${i}`;
    btn.dataset.index = i;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onPadPress(i);
    });
    padContainer.appendChild(btn);
    pads.push(btn);
  }
}

function lightPad(index, duration = 320) {
  return new Promise(resolve => {
    const pad = pads[index];
    if (!pad) { resolve(); return; }
    pad.classList.add('active');
    setTimeout(() => {
      pad.classList.remove('active');
      setTimeout(resolve, 90);
    }, duration);
  });
}

async function playSequence() {
  isPlayingSequence = true;
  isPlayerTurn = false;
  setPadsEnabled(false);
  setMessage('Kijk goed...', '#c4b5fd');

  await sleep(450);

  for (let i = 0; i < sequence.length; i++) {
    await lightPad(sequence[i], LEVELS[currentLevel].speed * 0.55);
    await sleep(LEVELS[currentLevel].speed * 0.25);
  }

  await sleep(200);
  isPlayingSequence = false;
  isPlayerTurn = true;
  playerStep = 0;
  setPadsEnabled(true);
  setMessage('Jouw beurt! Herhaal de volgorde', '#86efac');
}

function setPadsEnabled(enabled) {
  pads.forEach(p => {
    if (enabled) p.classList.remove('disabled');
    else p.classList.add('disabled');
  });
}

function onPadPress(index) {
  if (!isPlayerTurn || isPlayingSequence) return;

  // Visual feedback
  lightPad(index, 180);

  if (index === sequence[playerStep]) {
    // Correct
    pads[index].classList.add('correct-flash');
    setTimeout(() => pads[index].classList.remove('correct-flash'), 350);

    playerStep++;

    if (playerStep >= sequence.length) {
      // Sequence completed!
      isPlayerTurn = false;
      setPadsEnabled(false);
      handleSuccess();
    }
  } else {
    // Wrong
    pads[index].classList.add('wrong-flash');
    setTimeout(() => pads[index].classList.remove('wrong-flash'), 400);
    handleFail(playerStep === sequence.length - 1);
  }
}

function handleSuccess() {
  const cfg = LEVELS[currentLevel];
  const base = sequence.length * 25;
  // Variable reward: 20% chance of big multiplier (classic Skinner)
  const isJackpot = Math.random() < 0.22;
  const multiplier = isJackpot ? (2.5 + Math.random() * 2.5) : (1 + streak * 0.12);
  const points = Math.floor(base * multiplier);

  score += points;
  streak++;
  if (streak > maxStreak) maxStreak = streak;
  roundsDone++;

  if (isJackpot) {
    setMessage(`JACKPOT! +${points} ✨`, '#fde047');
  } else if (streak >= 3) {
    setMessage(`Streak x${streak}! +${points}`, '#67e8f9');
  } else {
    setMessage(`Perfect! +${points}`, '#86efac');
  }

  updateUI();

  if (roundsDone >= cfg.rounds) {
    setTimeout(() => endLevel(true), 900);
  } else {
    // Next sequence gets longer (flow + escalating challenge)
    currentSeqLen++;
    setTimeout(() => {
      generateSequence();
      playSequence();
    }, 1100);
  }
}

function handleFail(wasNearMiss) {
  isPlayerTurn = false;
  setPadsEnabled(false);
  lives--;
  streak = 0;
  updateUI();

  if (wasNearMiss) {
    setMessage('ZO DICHTBIJ! Bijna de hele reeks... 😬', '#fb923c');
  } else {
    setMessage('Fout! Probeer opnieuw', '#f87171');
  }

  if (lives <= 0) {
    setTimeout(() => endLevel(false), 1000);
  } else {
    // Retry same length (gentle recovery)
    setTimeout(() => {
      generateSequence();
      playSequence();
    }, 1300);
  }
}

function generateSequence() {
  const cfg = LEVELS[currentLevel];
  sequence = [];
  for (let i = 0; i < currentSeqLen; i++) {
    sequence.push(Math.floor(Math.random() * cfg.pads));
  }
}

function endLevel(success) {
  isPlayerTurn = false;
  isPlayingSequence = false;

  if (success) {
    const bonus = (currentLevel + 1) * 80 + maxStreak * 15;
    score += bonus;
    levelStats.innerHTML = `
      Score: <strong>${score}</strong><br>
      Max streak: <strong>${maxStreak}</strong><br>
      Level bonus: +${bonus}
    `;
    levelComplete.classList.remove('hidden');
  } else {
    finalScoreEl.textContent = `Eindscore: ${score}`;
    gameOverScreen.classList.remove('hidden');
  }
}

function startLevel() {
  const cfg = LEVELS[currentLevel];
  createPads(cfg.pads);
  roundsDone = 0;
  lives = cfg.lives;
  streak = 0;
  maxStreak = 0;
  currentSeqLen = cfg.startLen;
  sequence = [];
  playerStep = 0;
  isPlayingSequence = false;
  isPlayerTurn = false;

  overlay.classList.add('hidden');
  levelComplete.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  winScreen.classList.add('hidden');

  updateUI();
  setMessage('Maak je klaar...', '#c4b5fd');

  setTimeout(() => {
    generateSequence();
    playSequence();
  }, 700);
}

function nextLevel() {
  currentLevel++;
  if (currentLevel >= LEVELS.length) {
    winScoreEl.innerHTML = `Fantastische score: <strong>${score}</strong><br>Je hebt alle 10 levels gehaald!`;
    winScreen.classList.remove('hidden');
    levelComplete.classList.add('hidden');
    return;
  }
  startLevel();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Buttons
startBtn.addEventListener('click', () => {
  currentLevel = 0;
  score = 0;
  startLevel();
});

nextBtn.addEventListener('click', nextLevel);

retryBtn.addEventListener('click', () => {
  currentLevel = 0;
  score = 0;
  startLevel();
});

playAgainBtn.addEventListener('click', () => {
  currentLevel = 0;
  score = 0;
  winScreen.classList.add('hidden');
  startLevel();
});

// Initial state
updateUI();
