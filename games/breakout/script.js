/* 벽돌깨기 게임 로직 */
(function () {
  "use strict";

  var W = 384, H = 552;
  var PADDLE_W = 90, PADDLE_H = 12, PADDLE_Y = H - 32;
  var BALL_R = 7;
  var ROWS = 6, COLS = 8, MARGIN = 10, GAP = 5, BRICK_TOP = 48, BRICK_H = 20;
  var BRICK_W = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
  var ROW_COLORS = ["#e0324b", "#f2b179", "#edc850", "#3ddc84", "#4a6cf7", "#a78bfa"];
  var BEST_KEY = "gtb-breakout-best";

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score-value");
  var livesEl = document.getElementById("lives-value");
  var bestEl = document.getElementById("best-value");
  var overlay = document.getElementById("arcade-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");

  canvas.width = W;
  canvas.height = H;

  var paddle, ball, bricks, score, lives, state, rafId, trail, particles;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);
  var leftPressed = false, rightPressed = false;
  var lastTime = null;

  function spawnBrickParticles(b) {
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (var i = 0; i < 8; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 100;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color: b.color
      });
    }
  }

  function buildBricks() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        bricks.push({
          x: MARGIN + c * (BRICK_W + GAP),
          y: BRICK_TOP + r * (BRICK_H + GAP),
          w: BRICK_W,
          h: BRICK_H,
          color: ROW_COLORS[r % ROW_COLORS.length],
          alive: true
        });
      }
    }
  }

  function attachBallToPaddle() {
    ball = {
      x: paddle.x + paddle.w / 2,
      y: PADDLE_Y - BALL_R - 1,
      vx: 0,
      vy: 0,
      r: BALL_R
    };
  }

  function launchBall() {
    var angle = (Math.random() * 80 - 40) * (Math.PI / 180); // -40~40도
    var speed = 300;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    state = "playing";
  }

  function resetGame() {
    paddle = { x: (W - PADDLE_W) / 2, w: PADDLE_W, h: PADDLE_H };
    trail = [];
    particles = [];
    score = 0;
    lives = 3;
    state = "idle";
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    bestEl.textContent = best;
    buildBricks();
    attachBallToPaddle();
    hideOverlay();
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function loseLife() {
    GTBSfx.explode();
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) {
      gameOver();
    } else {
      state = "idle";
      attachBallToPaddle();
    }
  }

  function gameOver() {
    state = "over";
    GTBSfx.gameover();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem(BEST_KEY, String(best));
    }
    showOverlay("게임 오버", "최종 점수 " + score + "점. 공을 놓쳤습니다.", [
      { label: "🔄 다시 하기", action: resetGame }
    ]);
  }

  function winGame() {
    state = "won";
    GTBSfx.win();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem(BEST_KEY, String(best));
    }
    showOverlay("🎉 클리어!", "모든 벽돌을 깼습니다! 점수 " + score + "점.", [
      { label: "🔄 다시 하기", action: resetGame }
    ]);
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

  function updateParticles(dt) {
    particles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    particles = particles.filter(function (p) { return p.life > 0; });
  }

  function update(dt) {
    updateParticles(dt);

    if (leftPressed) paddle.x -= 384 * dt;
    if (rightPressed) paddle.x += 384 * dt;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    if (state === "idle") {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = PADDLE_Y - BALL_R - 1;
      trail = [];
      return;
    }
    if (state !== "playing") return;

    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 8) trail.shift();

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y - ball.r > H) { loseLife(); return; }

    // 패들 충돌
    if (
      ball.vy > 0 &&
      ball.y + ball.r >= PADDLE_Y &&
      ball.y + ball.r <= PADDLE_Y + paddle.h + 8 &&
      ball.x >= paddle.x - ball.r &&
      ball.x <= paddle.x + paddle.w + ball.r
    ) {
      var hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1~1
      var angle = hitPos * (Math.PI / 3); // 최대 60도
      var speed = Math.min(500, Math.hypot(ball.vx, ball.vy) * 1.02);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -Math.abs(speed * Math.cos(angle));
      ball.y = PADDLE_Y - ball.r - 1;
    }

    // 벽돌 충돌
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (
        ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h
      ) {
        b.alive = false;
        GTBSfx.hit();
        spawnBrickParticles(b);
        score += 10;
        scoreEl.textContent = score;
        ball.vy *= -1;
        break;
      }
    }

    if (bricks.every(function (b) { return !b.alive; })) {
      winGame();
    }
  }

  function drawRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function render() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    bricks.forEach(function (b) {
      if (!b.alive) return;
      drawRoundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h * 0.4);
    });

    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    });

    trail.forEach(function (p, i) {
      var a = ((i + 1) / trail.length) * 0.28;
      ctx.fillStyle = "rgba(242,177,121," + a.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, ball.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    var pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
    pg.addColorStop(0, "#c9cdda");
    pg.addColorStop(0.5, "#f4f5f9");
    pg.addColorStop(1, "#c9cdda");
    drawRoundRect(paddle.x, PADDLE_Y, paddle.w, paddle.h, 4);
    ctx.fillStyle = pg;
    ctx.fill();

    var bg = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x, ball.y, ball.r);
    bg.addColorStop(0, "#ffe1c2");
    bg.addColorStop(1, "#f2b179");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = Math.min(0.032, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function pointerToCanvasX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }

  canvas.addEventListener("mousemove", function (e) {
    var x = pointerToCanvasX(e.clientX);
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  });

  canvas.addEventListener("touchmove", function (e) {
    var x = pointerToCanvasX(e.touches[0].clientX);
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  }, { passive: true });

  function tryLaunch() {
    if (state === "idle") launchBall();
  }

  canvas.addEventListener("mousedown", tryLaunch);
  canvas.addEventListener("touchstart", tryLaunch, { passive: true });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a") leftPressed = true;
    if (e.key === "ArrowRight" || e.key === "d") rightPressed = true;
    if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); tryLaunch(); }
  });

  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
    if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
  });

  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
