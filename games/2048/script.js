/* 2048 게임 로직 */
(function () {
  "use strict";

  var SIZE = 4;
  var GAP = 10;
  var BEST_KEY = "gtb-2048-best";

  var tileLayer = document.getElementById("tile-layer");
  var gridBg = document.getElementById("grid-bg");
  var scoreEl = document.getElementById("score-value");
  var bestEl = document.getElementById("best-value");
  var overlay = document.getElementById("board-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");
  var boardEl = document.getElementById("board-2048");

  var tiles = [];
  var nextId = 1;
  var score = 0;
  var best = Number(localStorage.getItem(BEST_KEY) || 0);
  var state = "playing"; // playing | won | over
  var wonAnnounced = false;
  var cellSize = 0;
  var pendingRemovals = [];

  function buildGridBg() {
    gridBg.innerHTML = "";
    for (var i = 0; i < SIZE * SIZE; i++) {
      var cell = document.createElement("div");
      cell.className = "grid-cell";
      gridBg.appendChild(cell);
    }
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function tileAt(r, c) {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].r === r && tiles[i].c === c) return tiles[i];
    }
    return null;
  }

  function emptyCells() {
    var result = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!tileAt(r, c)) result.push({ r: r, c: c });
      }
    }
    return result;
  }

  function spawnTile() {
    var cells = emptyCells();
    if (cells.length === 0) return;
    var pos = cells[Math.floor(Math.random() * cells.length)];
    tiles.push({
      id: nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      r: pos.r,
      c: pos.c,
      isNew: true,
      merged: false
    });
  }

  function updateCellSize() {
    cellSize = (tileLayer.clientWidth - GAP * (SIZE - 1)) / SIZE;
  }

  function tileClass(value) {
    if (value <= 2048) return "tile-v" + value;
    return "tile-super";
  }

  function lenClass(value) {
    var len = String(value).length;
    if (len >= 5) return "tile-len5";
    if (len === 4) return "tile-len4";
    return "";
  }

  function render() {
    updateCellSize();
    var seen = {};
    tiles.forEach(function (tile) {
      seen[tile.id] = true;
      var el = document.getElementById("tile-" + tile.id);
      var isNewEl = false;
      if (!el) {
        el = document.createElement("div");
        el.id = "tile-" + tile.id;
        el.className = "tile";
        tileLayer.appendChild(el);
        isNewEl = true;
      }
      el.className = "tile " + tileClass(tile.value) + " " + lenClass(tile.value);
      el.textContent = tile.value;
      el.style.width = cellSize + "px";
      el.style.height = cellSize + "px";
      var x = tile.c * (cellSize + GAP);
      var y = tile.r * (cellSize + GAP);
      if (isNewEl) {
        el.style.transition = "none";
        el.style.transform = "translate(" + x + "px," + y + "px)";
        // 강제 리플로우 후 트랜지션 복구 + 팝 애니메이션
        void el.offsetWidth;
        el.style.transition = "";
        el.classList.add("tile-pop");
      } else {
        el.style.transform = "translate(" + x + "px," + y + "px)";
        if (tile.merged) {
          el.classList.add("tile-merge-pop");
          setTimeout(function () { el.classList.remove("tile-merge-pop"); }, 160);
        }
      }
      tile.isNew = false;
      tile.merged = false;
    });

    // 병합되어 사라질 타일: 병합 위치로 슬라이드시킨 뒤 제거
    pendingRemovals.forEach(function (rm) {
      seen[rm.id] = true;
      var el = document.getElementById("tile-" + rm.id);
      if (!el) return;
      var rx = rm.c * (cellSize + GAP);
      var ry = rm.r * (cellSize + GAP);
      el.style.transform = "translate(" + rx + "px," + ry + "px)";
      setTimeout(function () { el.remove(); }, 130);
    });
    pendingRemovals = [];

    // 제거된 타일 DOM 정리
    Array.prototype.slice.call(tileLayer.children).forEach(function (child) {
      var id = Number(child.id.replace("tile-", ""));
      if (!seen[id]) child.remove();
    });

    scoreEl.textContent = score;
    bestEl.textContent = best;
  }

  var DIRS = {
    ArrowUp: { dr: -1, dc: 0 },
    ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: { dr: 0, dc: -1 },
    ArrowRight: { dr: 0, dc: 1 }
  };

  function move(dirKey) {
    if (state !== "playing") return;
    var vec = DIRS[dirKey];
    var sorted = tiles.slice().sort(function (a, b) {
      if (vec.dr !== 0) return vec.dr > 0 ? b.r - a.r : a.r - b.r;
      return vec.dc > 0 ? b.c - a.c : a.c - b.c;
    });

    var moved = false;
    var mergedIds = {};

    sorted.forEach(function (tile) {
      var cell = { r: tile.r, c: tile.c };
      while (true) {
        var next = { r: cell.r + vec.dr, c: cell.c + vec.dc };
        if (!inBounds(next.r, next.c)) break;
        var occupant = tileAt(next.r, next.c);
        if (!occupant) {
          cell = next;
          continue;
        }
        if (occupant.value === tile.value && !mergedIds[occupant.id] && occupant.id !== tile.id) {
          cell = next;
        }
        break;
      }

      var occupantAtCell = tileAt(cell.r, cell.c);
      if (occupantAtCell && occupantAtCell.id !== tile.id) {
        occupantAtCell.value *= 2;
        occupantAtCell.merged = true;
        mergedIds[occupantAtCell.id] = true;
        GTBSfx.merge();
        score += occupantAtCell.value;
        pendingRemovals.push({ id: tile.id, r: cell.r, c: cell.c });
        tiles = tiles.filter(function (t) { return t.id !== tile.id; });
        moved = true;
      } else {
        if (cell.r !== tile.r || cell.c !== tile.c) moved = true;
        tile.r = cell.r;
        tile.c = cell.c;
      }
    });

    if (!moved) return;

    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }

    spawnTile();
    render();
    checkWin();
    checkGameOver();
  }

  function hasMergeAvailable() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var tile = tileAt(r, c);
        if (!tile) return true; // 빈 칸이 있으면 이동 가능
        var right = tileAt(r, c + 1);
        var down = tileAt(r + 1, c);
        if (right && right.value === tile.value) return true;
        if (down && down.value === tile.value) return true;
      }
    }
    return false;
  }

  function checkWin() {
    if (wonAnnounced) return;
    var has2048 = tiles.some(function (t) { return t.value >= 2048; });
    if (has2048) {
      wonAnnounced = true;
      state = "won";
      GTBSfx.win();
      showOverlay(
        "🎉 2048 달성!",
        "축하합니다! 점수 " + score + "점. 계속 진행해서 더 높은 타일에 도전할 수 있습니다.",
        [
          { label: "계속하기", primary: false, action: function () { hideOverlay(); state = "playing"; } },
          { label: "🔄 다시 하기", primary: true, action: resetGame }
        ]
      );
    }
  }

  function checkGameOver() {
    if (state === "won") return;
    if (!hasMergeAvailable()) {
      state = "over";
      GTBSfx.gameover();
      showOverlay(
        "게임 오버",
        "더 이상 이동할 수 없습니다. 최종 점수 " + score + "점.",
        [{ label: "🔄 다시 하기", primary: true, action: resetGame }]
      );
    }
  }

  function showOverlay(title, desc, buttons) {
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayActions.innerHTML = "";
    buttons.forEach(function (btn) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = btn.primary ? "btn" : "btn btn-outline";
      b.textContent = btn.label;
      b.addEventListener("click", btn.action);
      overlayActions.appendChild(b);
    });
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function resetGame() {
    tiles = [];
    nextId = 1;
    score = 0;
    state = "playing";
    wonAnnounced = false;
    pendingRemovals = [];
    tileLayer.innerHTML = "";
    hideOverlay();
    spawnTile();
    spawnTile();
    render();
  }

  window.addEventListener("keydown", function (e) {
    if (DIRS[e.key]) {
      e.preventDefault();
      move(e.key);
    }
  });

  var touchStartX = 0, touchStartY = 0;
  boardEl.addEventListener("touchstart", function (e) {
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  boardEl.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var absX = Math.abs(dx), absY = Math.abs(dy);
    var THRESHOLD = 24;
    if (Math.max(absX, absY) < THRESHOLD) return;
    if (absX > absY) {
      move(dx > 0 ? "ArrowRight" : "ArrowLeft");
    } else {
      move(dy > 0 ? "ArrowDown" : "ArrowUp");
    }
  }, { passive: true });

  window.addEventListener("resize", function () {
    render();
  });

  restartBtnTop.addEventListener("click", resetGame);

  buildGridBg();
  resetGame();
})();
