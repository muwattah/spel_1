/**
 * Dopamine Dash – Spel 1
 * Gebouwd met psychologische principes van verslavende spellen:
 * - Variable Ratio Reinforcement (Skinner)
 * - Flow state (uitdaging vs vaardigheid)
 * - Juicy feedback + near-misses
 * - Duidelijke progressie + combo-systemen
 * - Compulsion loop: actie → beloning → nieuw doel
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startBtn = document.getElementById('start-btn');
const levelComplete = document.getElementById('level-complete');
const levelStats = document.getElementById('level-stats');
const nextLevelBtn = document.getElementById('next-level-btn');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const retryBtn = document.getElementById('retry-btn');

// Level configs – progressive difficulty + variable elements
const LEVELS = [
  // Level 1: introductie, makkelijk, hoge beloning
  { target: 12, spawnRate: 900, speedMin: 1.2, speedMax: 2.2, sizeMin: 38, sizeMax: 52, specialChance: 0.12, lives: 5 },
  // Level 2
  { target: 16, spawnRate: 800, speedMin: 1.4, speedMax: 2.5, sizeMin: 34, sizeMax: 48, specialChance: 0.15, lives: 5 },
  // Level 3
  { target: 20, spawnRate: 720, speedMin: 1.6, speedMax: 2.8, sizeMin: 30, sizeMax: 46, specialChance: 0.18, lives: 4 },
  // Level 4
  { target: 24, spawnRate: 650, speedMin: 1.8, speedMax: 3.1, sizeMin: 28, sizeMax: 44, specialChance: 0.20, lives: 4 },
  // Level 5 – halfweg, iets meer chaos
  { target: 28, spawnRate: 580, speedMin: 2.0, speedMax: 3.4, sizeMin: 26, sizeMax: 42, specialChance: 0.22, lives: 4 },
  // Level 6
  { target: 32, spawnRate: 520, speedMin: 2.2, speedMax: 3.7, sizeMin: 24, sizeMax: 40, specialChance: 0.25, lives: 3 },
  // Level 7
  { target: 36, spawnRate: 470, speedMin: 2.4, speedMax: 4.0, sizeMin: 22, sizeMax: 38, specialChance: 0.28, lives: 3 },
  // Level 8
  { target: 40, spawnRate: 420, speedMin: 2.6, speedMax: 4.3, sizeMin: 20, sizeMax: 36, specialChance: 0.30, lives: 3 },
  // Level 9
  { target: 45, spawnRate: 380, speedMin: 2.8, speedMax: 4.6, sizeMin: 18, sizeMax: 34, specialChance: 0.32, lives: 3 },
  // Level 10 – finale
  { target: 50, spawnRate: 340, speedMin: 3.0, speedMax: 5.0, sizeMin: 16, sizeMax: 32, specialChance: 0.35, lives: 3 }
];

const COLORS = [
  { fill: '#ff4081', glow: '#ff80ab' }, // roze
  { fill: '#00e5ff', glow: '#84ffff' }, // cyaan
  { fill: '#76ff03', glow: '#b2ff59' }, // lime
  { fill: '#ffea00', glow: '#ffff8d' }, // geel
  { fill: '#e040fb', glow: '#ea80fc' }, // paars
  { fill: '#ff6e40', glow: '#ff9e80' }  // oranje
];

let currentLevel = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let popped = 0;
let lives = 5;
let orbs = [];
let particles = [];
let floatingTexts = [];
let lastSpawn = 0;
let gameRunning = false;
let animationId = null;
let lastNearMiss = 0;

function resize() {
  const container = document.getElementById('game-container');
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = (rect.height - 90) * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = (rect.height - 90) + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

class Orb {
  constructor(cfg) {
    this.x = Math.random() * (canvas.width / (window.devicePixelRatio || 1) - 60) + 30;
    this.y = -40;
    this.radius = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    this.speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.isSpecial = Math.random() < cfg.specialChance;
    this.pulse = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.8; // lichte horizontale drift
  }

  update(dt) {
    this.y += this.speed * dt * 60;
    this.x += this.vx * dt * 60;
    this.pulse += 0.08;
  }

  draw() {
    const r = this.radius + (this.isSpecial ? Math.sin(this.pulse) * 3 : 0);
    
    // Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 8, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(this.x, this.y, r * 0.3, this.x, this.y, r + 8);
    gradient.addColorStop(0, this.color.glow + 'aa');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color.fill;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    if (this.isSpecial) {
      // Special indicator
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 2;
    this.life = 1;
    this.color = color;
    this.size = 3 + Math.random() * 4;
  }
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += 0.15;
    this.life -= dt * 1.8;
  }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class FloatingText {
  constructor(x, y, text, color = '#fff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1;
    this.vy = -1.8;
  }
  update(dt) {
    this.y += this.vy * dt * 60;
    this.life -= dt * 1.2;
  }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

function spawnOrb() {
  const cfg = LEVELS[currentLevel];
  orbs.push(new Orb(cfg));
}

function createExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function updateUI() {
  levelDisplay.textContent = currentLevel + 1;
  scoreDisplay.textContent = score;
  comboDisplay.textContent = combo;
  const cfg = LEVELS[currentLevel];
  const pct = Math.min(100, (popped / cfg.target) * 100);
  progressBar.style.width = pct + '%';
  progressText.textContent = `${popped} / ${cfg.target}`;
}

function showFloating(x, y, text, color) {
  floatingTexts.push(new FloatingText(x, y, text, color));
}

function popOrb(orb, index) {
  const base = Math.floor(orb.radius * 1.5);
  let points = base;

  if (orb.isSpecial) {
    points = Math.floor(points * (2.5 + Math.random() * 2)); // variable big reward
    showFloating(orb.x, orb.y - 20, `+${points} ✨`, '#ffea00');
  } else {
    showFloating(orb.x, orb.y - 15, `+${points}`, '#fff');
  }

  // Combo system – variable reinforcement
  combo++;
  if (combo > maxCombo) maxCombo = combo;
  if (combo >= 3) {
    const comboBonus = Math.floor(points * (combo * 0.15));
    points += comboBonus;
    showFloating(orb.x, orb.y - 40, `COMBO x${combo}!`, '#00e5ff');
  }

  score += points;
  popped++;
  createExplosion(orb.x, orb.y, orb.color.fill, orb.isSpecial ? 18 : 10);
  orbs.splice(index, 1);

  // Near-miss feel for almost-missed orbs later
  updateUI();

  if (popped >= LEVELS[currentLevel].target) {
    endLevel(true);
  }
}

function checkNearMiss(x, y) {
  // Psychological near-miss: almost hit something → extra motivation
  for (const orb of orbs) {
    const dist = Math.hypot(orb.x - x, orb.y - y);
    if (dist < orb.radius + 28 && dist > orb.radius) {
      const now = performance.now();
      if (now - lastNearMiss > 600) {
        lastNearMiss = now;
        showFloating(x, y - 10, 'Bijna!', '#ff80ab');
        // Small visual pulse on the near-missed orb
        createExplosion(orb.x, orb.y, orb.color.glow, 4);
      }
      break;
    }
  }
}

function handleInput(clientX, clientY) {
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let hit = false;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    const dist = Math.hypot(orb.x - x, orb.y - y);
    if (dist < orb.radius + 6) {
      popOrb(orb, i);
      hit = true;
      break;
    }
  }
  if (!hit) {
    checkNearMiss(x, y);
    // Miss slightly reduces combo
    if (combo > 0) combo = Math.max(0, combo - 1);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleInput(e.clientX, e.clientY);
});

function endLevel(success) {
  gameRunning = false;
  cancelAnimationFrame(animationId);

  if (success) {
    const bonus = (currentLevel + 1) * 50 + maxCombo * 10;
    score += bonus;
    levelStats.innerHTML = `
      Score: <strong>${score}</strong><br>
      Max combo: <strong>${maxCombo}</strong><br>
      Level bonus: +${bonus}
    `;
    levelComplete.classList.remove('hidden');
  } else {
    finalScore.textContent = `Eindscore: ${score}`;
    gameOverScreen.classList.remove('hidden');
  }
}

function startLevel() {
  const cfg = LEVELS[currentLevel];
  orbs = [];
  particles = [];
  floatingTexts = [];
  popped = 0;
  combo = 0;
  maxCombo = 0;
  lives = cfg.lives;
  lastSpawn = performance.now();
  gameRunning = true;
  overlay.classList.add('hidden');
  levelComplete.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  updateUI();
  loop(performance.now());
}

function nextLevel() {
  currentLevel++;
  if (currentLevel >= LEVELS.length) {
    // Game compleet!
    overlayTitle.textContent = 'Je hebt alles gehaald! 🏆';
    overlayMessage.innerHTML = `Fantastische score: <strong>${score}</strong><br>Je hebt alle 10 levels gehaald.`;
    startBtn.textContent = 'Opnieuw spelen';
    startBtn.onclick = () => {
      currentLevel = 0;
      score = 0;
      startLevel();
    };
    overlay.classList.remove('hidden');
    return;
  }
  startLevel();
}

let lastTime = performance.now();
function loop(now) {
  if (!gameRunning) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Soft background particles for atmosphere
  ctx.fillStyle = 'rgba(0, 200, 255, 0.03)';
  for (let i = 0; i < 8; i++) {
    const px = (now / 30 + i * 80) % (w + 40) - 20;
    const py = (i * 97 + now / 50) % h;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spawn
  const cfg = LEVELS[currentLevel];
  if (now - lastSpawn > cfg.spawnRate) {
    spawnOrb();
    lastSpawn = now;
  }

  // Update & draw orbs
  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    orb.update(dt);
    orb.draw();

    // Missed – fell off screen
    if (orb.y - orb.radius > h) {
      orbs.splice(i, 1);
      lives--;
      combo = 0;
      showFloating(orb.x, h - 30, 'Miss!', '#ff5252');
      if (lives <= 0) {
        endLevel(false);
        return;
      }
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    particles[i].draw();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  // Floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update(dt);
    floatingTexts[i].draw();
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  // Lives indicator
  ctx.font = '14px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('❤️'.repeat(Math.max(0, lives)), 12, 22);

  animationId = requestAnimationFrame(loop);
}

// Event listeners
startBtn.addEventListener('click', () => {
  currentLevel = 0;
  score = 0;
  startLevel();
});

nextLevelBtn.addEventListener('click', nextLevel);
retryBtn.addEventListener('click', () => {
  currentLevel = 0;
  score = 0;
  startLevel();
});

// Initial overlay
overlay.classList.remove('hidden');
