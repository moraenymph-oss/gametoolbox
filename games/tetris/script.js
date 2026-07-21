/* 블록 쌓기 게임 로직 (테트리스 스타일) */
(function () {
  "use strict";

  var COLS = 10, ROWS = 20, CELL = 22;
  var NEXT_CELL = 16;
  var BEST_KEY = "gtb-tetris-best";

  var SHAPES = {
    I: { cells: [[1, 0], [1, 1], [1, 2], [1, 3]], color: "#4ad9e8" },
    O: { cells: [[1, 1], [1, 2], [2, 1], [2, 2]], color: "#f5d76e" },
    T: { cells: [[1, 0], [1, 1], [1, 2], [2, 1]], color: "#a78bfa" },
    S: { cells: [[1, 1], [1, 2], [2, 0], [2, 1]], color: "#3ddc84" },
    Z: { cells: [[1, 0], [1, 1], [2, 1], [2, 2]], color: "#e0324b" },
    J: { cells: [[1, 0], [2, 0], [2, 1], [2, 2]], color: "#4a6cf7" },
    L: { cells: [[1, 2], [2, 0], [2, 1], [2, 2]], color: "#f2b179" }
  };
  var TYPES = Object.keys(SHAPES);
  var LINE_SCORES = [0, 40, 100, 300, 1200];

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var nextCanvas = document.getElementById("next-canvas");
  var nextCtx = nextCanvas.getContext("2d");
  var scoreEl = document.getElementById("score-value");
  var linesEl = document.getElementById("lines-value");
  var levelEl = document.getElementById("level-value");
  var bestEl = document.getElementById("best-value");
  var overlay = document.getElementById("arcade-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");

  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  nextCanvas.width = 4 * NEXT_CELL;
  nextCanvas.height = 4 * NEXT_CELL;

  var board, current, next, bag;
  var score, lines, level, state, rafId, lastTime, dropAcc;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);

  function refillBag() {
    var arr = TYPES.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function drawFromBag() {
    if (!bag || bag.length === 0) bag = refillBag();
    return bag.pop();
  }

  function spawnPiece(type) {
    var shape = SHAPES[type];
    return {
      type: type,
      cells: shape.cells.map(function (c) { return c.slice(); }),
      color: shape.color,
      x: COLS / 2 - 2,
      y: -1
    };
  }

  function collides(cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      var r = y + cells[i][0];
      var c = x + cells[i][1];
      if (c < 0 || c >= COLS || r >= ROWS) return true;
      if (r >= 0 && board[r][c]) return true;
    }
    return false;
  }

  function rotateCells(cells) {
    return cells.map(function (c) {
      return [c[1], 3 - c[0]];
    });
  }

  function buildEmptyBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(null));
    return b;
  }

  function resetGame() {
    board = buildEmptyBoard();
    bag = null;
    score = 0;
    lines = 0;
    level = 1;
    state = "playing";
    dropAcc = 0;
    current = spawnPiece(drawFromBag());
    next = spawnPiece(drawFromBag());
    updateStats();
    hideOverlay();
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function updateStats() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
    bestEl.textContent = best;
  }

  function dropInterval() {
    return Math.max(110, 700 - (level - 1) * 55);
  }

  function tryMove(dx, dy) {
    if (state !== "playing") return false;
    if (!collides(current.cells, current.x + dx, current.y + dy)) {
      current.x += dx;
      current.y += dy;
      return true;
    }
    return false;
  }

  function tryRotate() {
    if (state !== "playing") return;
    var rotated = rotateCells(current.cells);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(rotated, current.x + kicks[i], current.y)) {
        current.cells = rotated;
        current.x += kicks[i];
        return;
      }
    }
  }

  function softDrop() {
    if (!tryMove(0, 1)) {
      lockPiece();
    } else {
      score += 1;
      scoreEl.textContent = score;
    }
  }

  function hardDrop() {
    if (state !== "playing") return;
    var dist = 0;
    while (!collides(current.cells, current.x, current.y + 1)) {
      current.y++;
      dist++;
    }
    score += dist * 2;
    scoreEl.textContent = score;
    lockPiece();
  }

  function lockPiece() {
    current.cells.forEach(function (c) {
      var r = current.y + c[0];
      var col = current.x + c[1];
      if (r < 0) return;
      board[r][col] = current.color;
    });

    if (current.cells.some(function (c) { return current.y + c[0] < 0; })) {
      gameOver();
      return;
    }

    clearLines();
    current = next;
    next = spawnPiece(drawFromBag());
    dropAcc = 0;

    if (collides(current.cells, current.x, current.y)) {
      gameOver();
    }
  }

  function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(function (cell) { return cell; })) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++; // 같은 인덱스 재검사
      }
    }
    if (cleared > 0) {
      lines += cleared;
      score += LINE_SCORES[cleared] * level;
      level = 1 + Math.floor(lines / 10);
      updateStats();
    }
  }

  function gameOver() {
    state = "over";
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    updateStats();
    showOverlay("게임 오버", "점수 " + score + "점 · " + lines + "줄 · 레벨 " + level + ".", [
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

  function drawCell(context, x, y, size, color) {
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, size - 2, size - 2);
  }

  function render() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c]) drawCell(ctx, c * CELL, r * CELL, CELL, board[r][c]);
      }
    }

    if (current) {
      current.cells.forEach(function (cell) {
        var r2 = current.y + cell[0];
        var c2 = current.x + cell[1];
        if (r2 >= 0) drawCell(ctx, c2 * CELL, r2 * CELL, CELL, current.color);
      });
    }

    nextCtx.fillStyle = "#0d1117";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (next) {
      next.cells.forEach(function (cell) {
        drawCell(nextCtx, cell[1] * NEXT_CELL, cell[0] * NEXT_CELL, NEXT_CELL, next.color);
      });
    }
  }

  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;

    if (state === "playing") {
      dropAcc += dt;
      if (dropAcc >= dropInterval()) {
        dropAcc = 0;
        if (!tryMove(0, 1)) lockPiece();
      }
    }

    render();
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", function (e) {
    if (state !== "playing") return;
    if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); tryMove(-1, 0); }
    else if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); tryMove(1, 0); }
    else if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); softDrop(); }
    else if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); tryRotate(); }
    else if (e.key === " ") { e.preventDefault(); hardDrop(); }
  });

  function bindPadButton(id, action, repeat) {
    var btn = document.getElementById(id);
    if (!btn) return;
    var intervalId = null;

    function fire() { action(); }

    btn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      fire();
      if (repeat) intervalId = setInterval(fire, 130);
    }, { passive: false });

    btn.addEventListener("touchend", function () {
      if (intervalId) clearInterval(intervalId);
    });

    btn.addEventListener("click", fire);
  }

  bindPadButton("pad-left", function () { tryMove(-1, 0); }, true);
  bindPadButton("pad-right", function () { tryMove(1, 0); }, true);
  bindPadButton("pad-rotate", tryRotate, false);
  bindPadButton("pad-down", softDrop, true);
  bindPadButton("pad-drop", hardDrop, false);

  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
