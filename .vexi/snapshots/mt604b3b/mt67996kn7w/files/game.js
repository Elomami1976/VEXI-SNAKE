/* ============ Snake Game ============ */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const btnStart = document.getElementById("btn-start");
const btnSound = document.getElementById("btn-sound");

const COLS = 20, ROWS = 20;
const CELL = canvas.width / COLS; // 24 px

// Classic-snake pacing: slow crawl at start, speeds up per food eaten
const BASE_SPEED = 230; // starting step interval (ms)
const MIN_SPEED  = 75;  // fastest allowed
const SPEED_STEP = 7;   // ms shaved off per food

let snake, dir, nextDirs, food, score, best, speed, alive, running, paused;

best = Number(localStorage.getItem("snake_best") || 0);
bestEl.textContent = best;

/* ---------- HUD buttons ---------- */
const btnPause = document.getElementById("btn-pause");

function syncSoundBtn() {
  btnSound.textContent = Sound.muted ? "SOUND OFF" : "SOUND ON";
  btnSound.classList.toggle("on", !Sound.muted);
}
btnSound.addEventListener("click", () => {
  Sound.unlock();
  Sound.toggle();
  syncSoundBtn();
});
syncSoundBtn();

function setPausedUI(on) {
  btnPause.classList.toggle("active", on);
  btnPause.textContent = on ? "RESUME" : "PAUSE";
}

function reset() {
  const cx = Math.floor(COLS / 2);
  snake = [{ x: cx, y: 10 }, { x: cx - 1, y: 10 }, { x: cx - 2, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDirs = [];
  score = 0;
  speed = BASE_SPEED;   // ms per step (lower = faster)
  alive = true;
  paused = false;
  placeFood();
  updateScore();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
}

function updateScore() {
  scoreEl.textContent = score;
}

/* ---------- Game loop ---------- */
let lastStep = 0;

function loop(ts) {
  if (!running) return;
  if (alive && !paused && ts - lastStep >= speed) {
    lastStep = ts;
    step();
  }
  if (alive || !running) draw(); else drawGameOver();
  if (running) requestAnimationFrame(loop);
}

function step() {
  // apply one queued direction per tick
  if (nextDirs.length) {
    const nd = nextDirs.shift();
    if (nd.x !== -dir.x || nd.y !== -dir.y) dir = nd;
  }

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // wall collision
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return die();

  // self collision (ignore tail tip — it moves away this tick)
  if (
    snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y)
  ) return die();

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScore();
    // classic-snake ramp: faster with every food eaten
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    placeFood();
    Sound.eat(score / 10); // blip pitch climbs with every food
  } else {
    snake.pop();
  }
}

function die() {
  alive = false;
  const isRecord = score > best;
  if (isRecord) {
    best = score;
    localStorage.setItem("snake_best", best);
    bestEl.textContent = best;
  }
  Sound.die();
  if (isRecord) setTimeout(() => Sound.highscore(), 750); // fanfare after crash
  showOverlay("GAME OVER", `Final score: ${score}`, "PLAY AGAIN");
}

/* ---------- Rendering ---------- */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  drawBoard();

  // food
  const pulse = 3 + Math.sin(performance.now() / 120) * 1.5;
  ctx.fillStyle = "#f87171";
  ctx.shadowColor = "#f87171";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    Math.max(4, CELL / 2 - pulse),
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  // snake
  for (let i = snake.length - 1; i >= 0; i--) {
    const t = i / snake.length;
    ctx.fillStyle =
      i === 0 ? "#bbf7d0" : `rgba(74,222,128,${1 - t * 0.55})`;
    roundRect(
      snake[i].x * CELL + 2,
      snake[i].y * CELL + 2,
      CELL - 4,
      CELL - 4,
      i === 0 ? 7 : 5
    );
    ctx.fill();
  }

  // eyes on the head
  const h = snake[0];
  ctx.fillStyle = "#0b1020";
  const ex = h.x * CELL + CELL / 2 + dir.x * 5;
  const ey = h.y * CELL + CELL / 2 + dir.y * 5;
  const px = dir.x === 0 ? 4 : 0;
  const py = dir.y === 0 ? 4 : 0;
  ctx.beginPath(); ctx.arc(ex - px, ey - py, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + px, ey + py, 2, 0, Math.PI * 2); ctx.fill();

  // paused banner
  if (paused && alive) {
    ctx.fillStyle = "rgba(10,13,25,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e5e9f0";
    ctx.font = "700 28px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
  }
}

function drawBoard() {
  ctx.fillStyle = "#171b2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
}

function drawGameOver() {
  drawBoard();
  // keep last frame visible but dimmed
  ctx.fillStyle = "rgba(10,13,25,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ---------- Overlay ---------- */
function showOverlay(title, text, btnLabel) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = text;
  btnStart.textContent = btnLabel;
  overlay.classList.remove("hidden");
}
function hideOverlay() { overlay.classList.add("hidden"); }

/* ---------- Controls ---------- */
function startGame() {
  Sound.unlock(); // browsers require a user gesture before audio
  Sound.start();
  reset();
  hideOverlay();
  running = true;
  lastStep = performance.now();
  requestAnimationFrame(loop);
}
function stopGame() {
  running = false;
}

btnStart.addEventListener("click", () => startGame());

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  const dirs = {
    arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
  };

  if (dirs[k]) {
    e.preventDefault();
    if (!running) { startGame(); return; }
    queueDir(dirs[k]);
  }
  if (k === "p" && running && alive) {
    paused = !paused;
    Sound.pause(paused);
  }
});

function queueDir(d) {
  const last = nextDirs[nextDirs.length - 1] || dir;
  if (d.x === -last.x && d.y === -last.y) return; // no instant reverse
  if (d.x === last.x && d.y === last.y) return;   // no duplicates
  if (nextDirs.length < 2) {
    nextDirs.push(d);
    Sound.turn();
  }
}

// Touch swipe support
let touchX = null, touchY = null;
canvas.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (!running) { startGame(); return; }
  queueDir(Math.abs(dx) > Math.abs(dy)
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) });
  touchX = touchY = null;
});

/* ---------- Init ---------- */
reset();
draw();
