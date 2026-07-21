/* 벽돌깨기 게임 로직 */
(function () {
  "use strict";

  var W = 320, H = 460;
  var PADDLE_W = 74, PADDLE_H = 10, PADDLE_Y = H - 26;
  var BALL_R = 6;
  var ROWS = 6, COLS = 8, MARGIN = 8, GAP = 4, BRICK_TOP = 40, BRICK_H = 16;
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

  var paddle, ball, bricks, score, lives, state, rafId;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);
  var leftPressed = false, rightPressed = false;
  var lastTime = null;

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
    var speed = 250;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    state = "playing";
  }

  function resetGame() {
    paddle = { x: (W - PADDLE_W) / 2, w: PADDLE_W, h: PADDLE_H };
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

  function update(dt) {
    if (leftPressed) paddle.x -= 320 * dt;
    if (rightPressed) paddle.x += 320 * dt;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    if (state === "idle") {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = PADDLE_Y - BALL_R - 1;
      return;
    }
    if (state !== "playing") return;

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
      var speed = Math.min(420, Math.hypot(ball.vx, ball.vy) * 1.02);
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

  function render() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    bricks.forEach(function (b) {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    ctx.fillStyle = "#e9eaf0";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, paddle.h, 4) : ctx.rect(paddle.x, PADDLE_Y, paddle.w, paddle.h);
    ctx.fill();

    ctx.fillStyle = "#f2b179";
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
