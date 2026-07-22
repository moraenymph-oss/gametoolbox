/* 스네이크 게임 로직 */
(function () {
  "use strict";

  var GRID = 18;
  var CELL = 26;
  var BEST_KEY = "gtb-snake-best";

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score-value");
  var bestEl = document.getElementById("best-value");
  var overlay = document.getElementById("arcade-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");

  canvas.width = GRID * CELL;
  canvas.height = GRID * CELL;

  var snake, dir, nextDir, food, score, tickMs, timerId, state;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);
  var rafId = null;
  var sparkles = [];

  function lerpColor(c1, c2, t) {
    var r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    var g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    var b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function spawnSparkles(gx, gy) {
    var cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
    for (var i = 0; i < 8; i++) {
      var angle = (Math.PI * 2 * i) / 8;
      sparkles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        life: 0.35
      });
    }
  }

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function placeFood() {
    var pos;
    do {
      pos = { x: randInt(GRID), y: randInt(GRID) };
    } while (snake.some(function (s) { return s.x === pos.x && s.y === pos.y; }));
    food = pos;
  }

  function resetGame() {
    snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    tickMs = 150;
    state = "idle";
    sparkles = [];
    scoreEl.textContent = score;
    bestEl.textContent = best;
    placeFood();
    hideOverlay();
    clearTimeout(timerId);
    startRenderLoop();
  }

  function startPlaying() {
    if (state !== "idle") return;
    state = "playing";
    scheduleTick();
  }

  function scheduleTick() {
    clearTimeout(timerId);
    timerId = setTimeout(tick, tickMs);
  }

  function tick() {
    if (state !== "playing") return;
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    var hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    var hitSelf = snake.some(function (s) { return s.x === head.x && s.y === head.y; });

    if (hitWall || hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      GTBSfx.eat();
      spawnSparkles(food.x, food.y);
      score += 10;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem(BEST_KEY, String(best));
      }
      tickMs = Math.max(70, tickMs - 3);
      placeFood();
    } else {
      snake.pop();
    }

    scheduleTick();
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (var i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }
  }

  var HEAD_COLOR = [61, 220, 132];
  var TAIL_COLOR = [22, 74, 48];

  function drawSnake() {
    var len = snake.length;
    for (var i = len - 1; i >= 0; i--) {
      var seg = snake[i];
      var t = len > 1 ? i / (len - 1) : 0;
      ctx.fillStyle = lerpColor(HEAD_COLOR, TAIL_COLOR, t);
      var pad = 1.5;
      roundedRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.fill();
    }

    // 머리 눈
    var head = snake[0];
    var cx = head.x * CELL + CELL / 2, cy = head.y * CELL + CELL / 2;
    var ex = dir.x * 4, ey = dir.y * 4;
    var perpX = -dir.y * 4, perpY = dir.x * 4;
    ctx.fillStyle = "#0d1117";
    ctx.beginPath();
    ctx.arc(cx + ex + perpX * 0.5, cy + ey + perpY * 0.5, 2, 0, Math.PI * 2);
    ctx.arc(cx + ex - perpX * 0.5, cy + ey - perpY * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFood(ts) {
    var pulse = 1 + Math.sin(ts / 180) * 0.14;
    var fx = food.x * CELL + CELL / 2;
    var fy = food.y * CELL + CELL / 2;
    ctx.fillStyle = "#e0324b";
    ctx.beginPath();
    ctx.arc(fx, fy, (CELL / 2.6) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(fx - 2.5, fy - 2.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateSparkles(dt) {
    sparkles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    sparkles = sparkles.filter(function (p) { return p.life > 0; });
  }

  function drawSparkles() {
    sparkles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 0.35);
      ctx.fillStyle = "#f5d76e";
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    });
  }

  var lastRenderTs = null;

  function render(ts) {
    ts = ts || 0;
    var dt = lastRenderTs === null ? 0 : Math.min(0.05, (ts - lastRenderTs) / 1000);
    lastRenderTs = ts;
    updateSparkles(dt);

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawFood(ts);
    drawSnake();
    drawSparkles();

    if (state === "idle") {
      ctx.fillStyle = "rgba(13,17,23,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f2f3f8";
      ctx.font = "700 " + Math.round(CELL * 0.85) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("탭하거나 방향키를 눌러 시작", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
  }

  function startRenderLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastRenderTs = null;
    function loop(ts) {
      render(ts);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function gameOver() {
    state = "over";
    GTBSfx.gameover();
    clearTimeout(timerId);
    showOverlay(
      "게임 오버",
      "점수 " + score + "점. 벽이나 몸통에 부딪혔습니다.",
      [{ label: "🔄 다시 하기", action: resetGame }]
    );
  }

  function showOverlay(title, desc, buttons) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayActions.innerHTML = "";
    buttons.forEach(function (btn) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = btn.label;
      b.addEventListener("click", btn.action);
      overlayActions.appendChild(b);
    });
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  var OPPOSITE = { ArrowUp: "ArrowDown", ArrowDown: "ArrowUp", ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" };
  var KEY_DIR = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
  };
  var lastKey = "ArrowRight";

  function trySetDir(key) {
    var d = KEY_DIR[key];
    if (!d) return;
    if (dir.x === -d.x && dir.y === -d.y) return; // 역방향 진입 방지
    nextDir = d;
    if (state === "idle") startPlaying();
  }

  window.addEventListener("keydown", function (e) {
    if (KEY_DIR[e.key]) {
      e.preventDefault();
      trySetDir(e.key);
    }
  });

  var touchStartX = 0, touchStartY = 0;
  canvas.addEventListener("touchstart", function (e) {
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      trySetDir(dx > 0 ? "ArrowRight" : "ArrowLeft");
    } else {
      trySetDir(dy > 0 ? "ArrowDown" : "ArrowUp");
    }
  }, { passive: true });

  canvas.addEventListener("click", function () {
    if (state === "idle") startPlaying();
  });

  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
