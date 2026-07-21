/* 지뢰찾기 게임 로직 */
(function () {
  "use strict";

  var DIFFICULTIES = {
    beginner: { rows: 9, cols: 9, mines: 10, label: "초급" },
    intermediate: { rows: 16, cols: 16, mines: 40, label: "중급" },
    expert: { rows: 16, cols: 30, mines: 99, label: "고급" }
  };

  var mineBoard = document.getElementById("mine-board");
  var minesLeftEl = document.getElementById("mines-left");
  var timerEl = document.getElementById("timer-value");
  var overlay = document.getElementById("ms-overlay");
  var overlayTitle = document.getElementById("ms-overlay-title");
  var overlayDesc = document.getElementById("ms-overlay-desc");
  var overlayActions = document.getElementById("ms-overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");
  var difficultyBtns = Array.prototype.slice.call(document.querySelectorAll(".difficulty-btn"));

  var currentDiff = "beginner";
  var rows, cols, totalMines;
  var cells = [];
  var cellEls = [];
  var state = "idle"; // idle | playing | won | lost
  var firstClickDone = false;
  var flagCount = 0;
  var revealedCount = 0;
  var seconds = 0;
  var timerInterval = null;

  function inBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function neighbors(r, c) {
    var result = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) result.push([nr, nc]);
      }
    }
    return result;
  }

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(function () {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateMinesLeft() {
    minesLeftEl.textContent = totalMines - flagCount;
  }

  function updateDifficultyButtons() {
    difficultyBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.difficulty === currentDiff);
    });
  }

  function buildBoardDOM() {
    mineBoard.innerHTML = "";
    mineBoard.className = "mine-board" + (currentDiff === "expert" ? " difficulty-expert" : "");
    mineBoard.style.gridTemplateColumns = "repeat(" + cols + ", var(--cell-size))";
    mineBoard.style.gridTemplateRows = "repeat(" + rows + ", var(--cell-size))";

    cellEls = [];
    for (var r = 0; r < rows; r++) {
      var rowEls = [];
      for (var c = 0; c < cols; c++) {
        var el = document.createElement("div");
        el.className = "mine-cell";
        attachCellEvents(el, r, c);
        mineBoard.appendChild(el);
        rowEls.push(el);
      }
      cellEls.push(rowEls);
    }
  }

  function attachCellEvents(el, r, c) {
    el.addEventListener("click", function () {
      handleOpen(r, c);
    });

    el.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      handleFlag(r, c);
    });

    var pressTimer = null;
    var longPressTriggered = false;
    var startX = 0, startY = 0;

    el.addEventListener("touchstart", function (e) {
      longPressTriggered = false;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      pressTimer = setTimeout(function () {
        longPressTriggered = true;
        handleFlag(r, c);
        if (navigator.vibrate) navigator.vibrate(15);
      }, 500);
    }, { passive: true });

    el.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
        clearTimeout(pressTimer);
      }
    }, { passive: true });

    el.addEventListener("touchend", function (e) {
      clearTimeout(pressTimer);
      if (longPressTriggered) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  function placeMines(excludeR, excludeC) {
    var forbidden = {};
    forbidden[excludeR + "," + excludeC] = true;
    neighbors(excludeR, excludeC).forEach(function (pos) {
      forbidden[pos[0] + "," + pos[1]] = true;
    });

    var placed = 0;
    while (placed < totalMines) {
      var r = Math.floor(Math.random() * rows);
      var c = Math.floor(Math.random() * cols);
      var key = r + "," + c;
      if (forbidden[key] || cells[r][c].mine) continue;
      cells[r][c].mine = true;
      placed++;
    }

    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        if (cells[r2][c2].mine) continue;
        var count = 0;
        neighbors(r2, c2).forEach(function (pos) {
          if (cells[pos[0]][pos[1]].mine) count++;
        });
        cells[r2][c2].adjacent = count;
      }
    }
  }

  function updateCellDOM(r, c) {
    var cell = cells[r][c];
    var el = cellEls[r][c];
    el.className = "mine-cell";
    el.innerHTML = "";
    if (cell.revealed) {
      el.classList.add("revealed");
      if (cell.mine) {
        el.textContent = "💣";
      } else if (cell.adjacent > 0) {
        var span = document.createElement("span");
        span.className = "n" + cell.adjacent;
        span.textContent = String(cell.adjacent);
        el.appendChild(span);
      }
    } else if (cell.flagged) {
      el.classList.add("flagged");
      el.textContent = "🚩";
    }
  }

  function reveal(startR, startC) {
    var stack = [[startR, startC]];
    while (stack.length) {
      var pos = stack.pop();
      var r = pos[0], c = pos[1];
      var cell = cells[r][c];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      revealedCount++;
      updateCellDOM(r, c);
      if (cell.adjacent === 0) {
        neighbors(r, c).forEach(function (npos) {
          var ncell = cells[npos[0]][npos[1]];
          if (!ncell.revealed && !ncell.flagged) stack.push(npos);
        });
      }
    }
  }

  function handleOpen(r, c) {
    if (state === "won" || state === "lost") return;
    var cell = cells[r][c];
    if (cell.flagged || cell.revealed) return;

    if (!firstClickDone) {
      placeMines(r, c);
      firstClickDone = true;
      state = "playing";
      startTimer();
    }

    if (cell.mine) {
      loseGame(r, c);
      return;
    }

    GTBSfx.select();
    reveal(r, c);
    checkWin();
  }

  function handleFlag(r, c) {
    if (state === "won" || state === "lost") return;
    var cell = cells[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    GTBSfx.flag();
    flagCount += cell.flagged ? 1 : -1;
    updateCellDOM(r, c);
    updateMinesLeft();
  }

  function loseGame(hitR, hitC) {
    state = "lost";
    GTBSfx.explode();
    stopTimer();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = cells[r][c];
        if (cell.mine && !cell.flagged) cell.revealed = true;
        updateCellDOM(r, c);
      }
    }
    cellEls[hitR][hitC].classList.add("mine-hit");
    showOverlay(
      "💥 게임 오버",
      "지뢰를 밟았습니다. 최종 시간 " + formatTime(seconds) + ". 다시 도전해보세요!",
      [{ label: "🔄 다시 하기", action: function () { newGame(currentDiff); } }]
    );
  }

  function checkWin() {
    if (revealedCount === rows * cols - totalMines) {
      state = "won";
      GTBSfx.win();
      stopTimer();
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cell = cells[r][c];
          if (cell.mine && !cell.flagged) {
            cell.flagged = true;
            updateCellDOM(r, c);
          }
        }
      }
      flagCount = totalMines;
      updateMinesLeft();
      showOverlay(
        "🎉 승리!",
        "소요 시간 " + formatTime(seconds) + "만에 모든 칸을 열었습니다!",
        [{ label: "🔄 다시 하기", action: function () { newGame(currentDiff); } }]
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

  function newGame(diffKey) {
    currentDiff = diffKey;
    var cfg = DIFFICULTIES[diffKey];
    rows = cfg.rows;
    cols = cfg.cols;
    totalMines = cfg.mines;

    state = "idle";
    firstClickDone = false;
    flagCount = 0;
    revealedCount = 0;
    seconds = 0;
    stopTimer();
    timerEl.textContent = "00:00";

    cells = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        row.push({ mine: false, revealed: false, flagged: false, adjacent: 0 });
      }
      cells.push(row);
    }

    buildBoardDOM();
    updateMinesLeft();
    hideOverlay();
    updateDifficultyButtons();
  }

  difficultyBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      newGame(btn.dataset.difficulty);
    });
  });

  restartBtnTop.addEventListener("click", function () {
    newGame(currentDiff);
  });

  document.addEventListener("contextmenu", function (e) {
    if (e.target.closest && e.target.closest(".mine-board")) {
      e.preventDefault();
    }
  });

  newGame("beginner");
})();
