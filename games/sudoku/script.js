/* 스도쿠 게임 로직 */
(function () {
  "use strict";

  var DIFFICULTIES = {
    easy: { clues: 38, label: "초급" },
    medium: { clues: 30, label: "중급" },
    hard: { clues: 24, label: "고급" }
  };
  var HINTS_TOTAL = 3;

  var boardEl = document.getElementById("sudoku-board");
  var timerEl = document.getElementById("timer-value");
  var hintsEl = document.getElementById("hints-value");
  var hintBtn = document.getElementById("hint-btn");
  var overlay = document.getElementById("sudoku-overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayDesc = document.getElementById("overlay-desc");
  var overlayActions = document.getElementById("overlay-actions");
  var restartBtnTop = document.getElementById("restart-btn-top");
  var difficultyBtns = Array.prototype.slice.call(document.querySelectorAll(".difficulty-btn"));
  var numberPad = document.getElementById("number-pad");
  var noteToggleBtn = document.getElementById("note-toggle-btn");

  var currentDiff = "easy";
  var solution, puzzle, grid, given, notes;
  var cellEls = [];
  var selected = null;
  var hintsLeft = HINTS_TOTAL;
  var seconds = 0, timerInterval = null;
  var state = "playing";
  var noteMode = false;

  function makeEmptyNotes() {
    var n = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) row.push({});
      n.push(row);
    }
    return n;
  }

  function makeEmptyGrid() {
    var g = [];
    for (var r = 0; r < 9; r++) g.push(new Array(9).fill(0));
    return g;
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function isValid(g, r, c, num) {
    for (var i = 0; i < 9; i++) {
      if (g[r][i] === num) return false;
      if (g[i][c] === num) return false;
    }
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (var i2 = 0; i2 < 3; i2++) {
      for (var j2 = 0; j2 < 3; j2++) {
        if (g[br + i2][bc + j2] === num) return false;
      }
    }
    return true;
  }

  function fillGrid(g) {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (g[r][c] === 0) {
          var nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (var i = 0; i < nums.length; i++) {
            var num = nums[i];
            if (isValid(g, r, c, num)) {
              g[r][c] = num;
              if (fillGrid(g)) return true;
              g[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function hasUniqueSolution(g) {
    var solutions = 0;

    function backtrack() {
      if (solutions >= 2) return;
      for (var r = 0; r < 9; r++) {
        for (var c = 0; c < 9; c++) {
          if (g[r][c] === 0) {
            for (var num = 1; num <= 9; num++) {
              if (solutions >= 2) return;
              if (isValid(g, r, c, num)) {
                g[r][c] = num;
                backtrack();
                g[r][c] = 0;
              }
            }
            return;
          }
        }
      }
      solutions++;
    }

    backtrack();
    return solutions === 1;
  }

  function generatePuzzle(diffKey) {
    var targetClues = DIFFICULTIES[diffKey].clues;
    var sol = makeEmptyGrid();
    fillGrid(sol);

    var puz = sol.map(function (row) { return row.slice(); });
    var positions = [];
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) positions.push([r, c]);
    positions = shuffled(positions);

    var clues = 81;
    for (var i = 0; i < positions.length && clues > targetClues; i++) {
      var r2 = positions[i][0], c2 = positions[i][1];
      var backup = puz[r2][c2];
      puz[r2][c2] = 0;
      var test = puz.map(function (row) { return row.slice(); });
      if (hasUniqueSolution(test)) {
        clues--;
      } else {
        puz[r2][c2] = backup;
      }
    }

    return { solution: sol, puzzle: puz };
  }

  function buildBoardDOM() {
    boardEl.innerHTML = "";
    cellEls = [];
    for (var r = 0; r < 9; r++) {
      var rowEls = [];
      for (var c = 0; c < 9; c++) {
        var cell = document.createElement("div");
        cell.className = "su-cell";
        if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add("border-right-thick");
        if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("border-bottom-thick");
        (function (rr, cc) {
          cell.addEventListener("click", function () { selectCell(rr, cc); });
        })(r, c);
        boardEl.appendChild(cell);
        rowEls.push(cell);
      }
      cellEls.push(rowEls);
    }
  }

  function selectCell(r, c) {
    if (state !== "playing") return;
    if (given[r][c]) {
      selected = { r: r, c: c };
      renderBoard();
      return;
    }
    selected = { r: r, c: c };
    renderBoard();
  }

  function setNumber(num) {
    if (state !== "playing" || !selected) return;
    var r = selected.r, c = selected.c;
    if (given[r][c]) return;

    if (noteMode) {
      if (grid[r][c]) return;
      notes[r][c][num] = !notes[r][c][num];
      GTBSfx.select();
      renderBoard();
      return;
    }

    GTBSfx.select();
    grid[r][c] = num;
    notes[r][c] = {};
    renderBoard();
    checkWin();
  }

  function eraseCell() {
    if (state !== "playing" || !selected) return;
    var r = selected.r, c = selected.c;
    if (given[r][c]) return;
    grid[r][c] = 0;
    notes[r][c] = {};
    renderBoard();
  }

  function useHint() {
    if (state !== "playing" || !selected || hintsLeft <= 0) return;
    var r = selected.r, c = selected.c;
    if (given[r][c]) return;
    grid[r][c] = solution[r][c];
    notes[r][c] = {};
    hintsLeft--;
    hintsEl.textContent = hintsLeft;
    hintBtn.disabled = hintsLeft <= 0;
    renderBoard();
    checkWin();
  }

  function toggleNoteMode() {
    noteMode = !noteMode;
    noteToggleBtn.classList.toggle("active", noteMode);
  }

  function hasConflict(r, c) {
    var num = grid[r][c];
    if (!num) return false;
    for (var i = 0; i < 9; i++) {
      if (i !== c && grid[r][i] === num) return true;
      if (i !== r && grid[i][c] === num) return true;
    }
    var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (var i2 = 0; i2 < 3; i2++) {
      for (var j2 = 0; j2 < 3; j2++) {
        var rr = br + i2, cc = bc + j2;
        if ((rr !== r || cc !== c) && grid[rr][cc] === num) return true;
      }
    }
    return false;
  }

  function renderNotes(el, noteSet) {
    var hasAny = false;
    for (var n = 1; n <= 9; n++) {
      if (noteSet[n]) { hasAny = true; break; }
    }
    if (!hasAny) {
      el.textContent = "";
      return;
    }
    el.innerHTML = "";
    var grid9 = document.createElement("div");
    grid9.className = "su-notes";
    for (var i = 1; i <= 9; i++) {
      var span = document.createElement("span");
      span.textContent = noteSet[i] ? String(i) : "";
      grid9.appendChild(span);
    }
    el.appendChild(grid9);
  }

  function renderBoard() {
    var selNum = selected ? grid[selected.r][selected.c] : 0;
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var el = cellEls[r][c];
        var num = grid[r][c];
        if (num) {
          el.textContent = String(num);
        } else {
          renderNotes(el, notes[r][c]);
        }
        el.classList.remove("given", "selected", "peer", "same-number", "conflict");
        if (given[r][c]) el.classList.add("given");

        if (selected) {
          var sameRow = r === selected.r;
          var sameCol = c === selected.c;
          var sameBox = Math.floor(r / 3) === Math.floor(selected.r / 3) && Math.floor(c / 3) === Math.floor(selected.c / 3);
          if (r === selected.r && c === selected.c) {
            el.classList.add("selected");
          } else if (sameRow || sameCol || sameBox) {
            el.classList.add("peer");
          }
        }

        if (selNum && num === selNum && !(selected.r === r && selected.c === c)) {
          el.classList.add("same-number");
        }

        if (hasConflict(r, c)) {
          el.classList.add("conflict");
        }
      }
    }
  }

  function checkWin() {
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        if (grid[r][c] !== solution[r][c]) return;
      }
    }
    state = "won";
    GTBSfx.win();
    stopTimer();
    showOverlay("🎉 완성!", "소요 시간 " + formatTime(seconds) + "만에 스도쿠를 완성했습니다!", [
      { label: "🔄 새 게임", action: function () { newGame(currentDiff); } }
    ]);
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

  function updateDifficultyButtons() {
    difficultyBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.difficulty === currentDiff);
    });
  }

  function newGame(diffKey) {
    currentDiff = diffKey;
    var gen = generatePuzzle(diffKey);
    solution = gen.solution;
    puzzle = gen.puzzle;
    grid = puzzle.map(function (row) { return row.slice(); });
    given = puzzle.map(function (row) { return row.map(function (v) { return v !== 0; }); });
    notes = makeEmptyNotes();

    selected = null;
    hintsLeft = HINTS_TOTAL;
    seconds = 0;
    state = "playing";
    noteMode = false;
    noteToggleBtn.classList.remove("active");

    hintsEl.textContent = hintsLeft;
    hintBtn.disabled = false;
    timerEl.textContent = "00:00";
    hideOverlay();
    updateDifficultyButtons();
    buildBoardDOM();
    renderBoard();
    startTimer();
  }

  numberPad.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.num) setNumber(Number(btn.dataset.num));
    if (btn.dataset.action === "erase") eraseCell();
  });

  window.addEventListener("keydown", function (e) {
    if (state !== "playing") return;
    if (e.key === "n" || e.key === "N") {
      toggleNoteMode();
      return;
    }
    if (!selected) return;
    if (e.key >= "1" && e.key <= "9") {
      setNumber(Number(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      eraseCell();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectCell(Math.max(0, selected.r - 1), selected.c);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectCell(Math.min(8, selected.r + 1), selected.c);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectCell(selected.r, Math.max(0, selected.c - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      selectCell(selected.r, Math.min(8, selected.c + 1));
    }
  });

  hintBtn.addEventListener("click", useHint);
  noteToggleBtn.addEventListener("click", toggleNoteMode);

  difficultyBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      newGame(btn.dataset.difficulty);
    });
  });

  restartBtnTop.addEventListener("click", function () {
    newGame(currentDiff);
  });

  newGame("easy");
})();
