/* 스네이크 게임 로직 */
(function () {
  "use strict";

  var GRID = 18;
  var CELL = 20;
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
    tickMs = 140;
    state = "playing";
    scoreEl.textContent = score;
    bestEl.textContent = best;
    placeFood();
    hideOverlay();
    scheduleTick();
    render();
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

    render();
    scheduleTick();
  }

  function render() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e0324b";
    var fx = food.x * CELL + CELL / 2;
    var fy = food.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach(function (seg, i) {
      ctx.fillStyle = i === 0 ? "#3ddc84" : "#2a9d5c";
      var pad = 1.5;
      ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    });
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

  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
