/* 우주 슈팅 게임 로직 (갤러그 스타일) */
(function () {
  "use strict";

  var W = 340, H = 520;
  var SHIP_W = 30, SHIP_H = 22, SHIP_Y = H - 42;
  var SHIP_SPEED = 280;
  var BULLET_SPEED = 420, FIRE_INTERVAL = 0.28;
  var ENEMY_W = 24, ENEMY_H = 18, GAP_X = 12, GAP_Y = 14, ENEMY_TOP = 36;
  var STEP_DOWN = 14;
  var ENEMY_BULLET_SPEED = 210;
  var BEST_KEY = "gtb-shooter-best";
  var ROW_COLORS = ["#e0324b", "#f2b179", "#3ddc84", "#4a6cf7", "#a78bfa", "#f5d76e"];

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score-value");
  var livesEl = document.getElementById("lives-value");
  var waveEl = document.getElementById("wave-value");
  var bestEl = document.getElementById("best-value");
  var overlay = document.getElementById("arcade-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");

  canvas.width = W;
  canvas.height = H;

  var ship, enemies, playerBullets, enemyBullets;
  var group, score, lives, wave, state, rafId, lastTime;
  var fireTimer = 0, enemyFireTimer = 0, invulnTimer = 0, edgeCooldown = 0;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);
  var leftPressed = false, rightPressed = false;

  function buildWave() {
    var rows = Math.min(3 + Math.floor(wave / 2), 6);
    var cols = Math.min(5 + wave, 9);
    var totalW = cols * ENEMY_W + (cols - 1) * GAP_X;
    var startX = (W - totalW) / 2;

    enemies = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        enemies.push({
          baseX: startX + c * (ENEMY_W + GAP_X),
          baseY: ENEMY_TOP + r * (ENEMY_H + GAP_Y),
          color: ROW_COLORS[r % ROW_COLORS.length],
          alive: true
        });
      }
    }

    group = {
      offsetX: 0,
      offsetY: 0,
      dir: 1,
      speed: 34 + wave * 6
    };
    enemyFireTimer = 0;
  }

  function resetGame() {
    ship = { x: W / 2 };
    playerBullets = [];
    enemyBullets = [];
    score = 0;
    lives = 3;
    wave = 1;
    state = "playing";
    invulnTimer = 0;
    fireTimer = 0;
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
    bestEl.textContent = best;
    buildWave();
    hideOverlay();
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function enemyFireInterval() {
    return Math.max(0.35, 1.05 - wave * 0.08);
  }

  function aliveEnemies() {
    return enemies.filter(function (e) { return e.alive; });
  }

  function enemyPos(e) {
    return { x: e.baseX + group.offsetX, y: e.baseY + group.offsetY };
  }

  function update(dt) {
    if (state !== "playing") return;

    if (leftPressed) ship.x -= SHIP_SPEED * dt;
    if (rightPressed) ship.x += SHIP_SPEED * dt;
    ship.x = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, ship.x));

    if (invulnTimer > 0) invulnTimer -= dt;

    // 플레이어 발사
    fireTimer += dt;
    if (fireTimer >= FIRE_INTERVAL) {
      fireTimer = 0;
      playerBullets.push({ x: ship.x, y: SHIP_Y - SHIP_H / 2 });
    }
    playerBullets.forEach(function (b) { b.y -= BULLET_SPEED * dt; });
    playerBullets = playerBullets.filter(function (b) { return b.y > -10; });

    // 적 편대 이동
    if (edgeCooldown > 0) edgeCooldown -= dt;
    group.offsetX += group.dir * group.speed * dt;

    var alive = aliveEnemies();
    if (alive.length && edgeCooldown <= 0) {
      var minX = Math.min.apply(null, alive.map(function (e) { return e.baseX + group.offsetX; }));
      var maxX = Math.max.apply(null, alive.map(function (e) { return e.baseX + group.offsetX + ENEMY_W; }));
      if (minX <= 4 || maxX >= W - 4) {
        group.dir *= -1;
        group.offsetY += STEP_DOWN;
        edgeCooldown = 0.35;
      }
    }

    // 적 침공 판정 (바닥 근처 도달)
    var lowestY = alive.length ? Math.max.apply(null, alive.map(function (e) { return e.baseY + group.offsetY + ENEMY_H; })) : 0;
    if (lowestY >= SHIP_Y - 8) {
      gameOver("적이 기지까지 침투했습니다!");
      return;
    }

    // 적 발사
    enemyFireTimer += dt;
    if (enemyFireTimer >= enemyFireInterval() && alive.length) {
      enemyFireTimer = 0;
      var shooter = alive[Math.floor(Math.random() * alive.length)];
      var pos = enemyPos(shooter);
      enemyBullets.push({ x: pos.x + ENEMY_W / 2, y: pos.y + ENEMY_H });
    }
    enemyBullets.forEach(function (b) { b.y += ENEMY_BULLET_SPEED * dt; });
    enemyBullets = enemyBullets.filter(function (b) { return b.y < H + 10; });

    // 충돌: 플레이어 총알 vs 적
    for (var i = 0; i < playerBullets.length; i++) {
      var b = playerBullets[i];
      var hit = null;
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (!e.alive) continue;
        var p = enemyPos(e);
        if (b.x > p.x && b.x < p.x + ENEMY_W && b.y > p.y && b.y < p.y + ENEMY_H) {
          hit = e;
          break;
        }
      }
      if (hit) {
        hit.alive = false;
        playerBullets.splice(i, 1);
        i--;
        score += 20;
        scoreEl.textContent = score;
      }
    }

    // 충돌: 적 총알 vs 플레이어
    if (invulnTimer <= 0) {
      for (var k = 0; k < enemyBullets.length; k++) {
        var eb = enemyBullets[k];
        if (
          eb.x > ship.x - SHIP_W / 2 && eb.x < ship.x + SHIP_W / 2 &&
          eb.y > SHIP_Y - SHIP_H / 2 && eb.y < SHIP_Y + SHIP_H / 2
        ) {
          enemyBullets.splice(k, 1);
          hitShip();
          break;
        }
      }
    }

    // 웨이브 클리어
    if (aliveEnemies().length === 0) {
      wave++;
      waveEl.textContent = wave;
      buildWave();
    }
  }

  function hitShip() {
    lives--;
    livesEl.textContent = lives;
    invulnTimer = 1.4;
    if (lives <= 0) {
      gameOver("기지가 파괴되었습니다.");
    }
  }

  function gameOver(reason) {
    state = "over";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem(BEST_KEY, String(best));
    }
    showOverlay("게임 오버", reason + " 점수 " + score + "점 · 웨이브 " + wave + "까지 도달.", [
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

  function render() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // 적
    enemies.forEach(function (e) {
      if (!e.alive) return;
      var p = enemyPos(e);
      ctx.fillStyle = e.color;
      ctx.fillRect(p.x, p.y, ENEMY_W, ENEMY_H);
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(p.x + 5, p.y + 5, 3, 3);
      ctx.fillRect(p.x + ENEMY_W - 8, p.y + 5, 3, 3);
    });

    // 총알
    ctx.fillStyle = "#7fd1ff";
    playerBullets.forEach(function (b) {
      ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
    });
    ctx.fillStyle = "#ff8a5c";
    enemyBullets.forEach(function (b) {
      ctx.fillRect(b.x - 2, b.y - 5, 4, 9);
    });

    // 플레이어
    var flashHidden = invulnTimer > 0 && Math.floor(invulnTimer * 10) % 2 === 0;
    if (!flashHidden) {
      ctx.fillStyle = "#3ddc84";
      ctx.beginPath();
      ctx.moveTo(ship.x, SHIP_Y - SHIP_H / 2);
      ctx.lineTo(ship.x - SHIP_W / 2, SHIP_Y + SHIP_H / 2);
      ctx.lineTo(ship.x + SHIP_W / 2, SHIP_Y + SHIP_H / 2);
      ctx.closePath();
      ctx.fill();
    }
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
    ship.x = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, pointerToCanvasX(e.clientX)));
  });

  canvas.addEventListener("touchmove", function (e) {
    ship.x = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, pointerToCanvasX(e.touches[0].clientX)));
  }, { passive: true });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a") { leftPressed = true; e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "d") { rightPressed = true; e.preventDefault(); }
  });

  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
    if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
  });

  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
