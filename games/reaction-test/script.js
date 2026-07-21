/* 반응속도 테스트 게임 로직 */
(function () {
  "use strict";

  var ROUNDS_TOTAL = 5;
  var MIN_DELAY = 1500;
  var MAX_DELAY = 4000;

  var stage = document.getElementById("reaction-stage");
  var stageText = document.getElementById("stage-text");
  var statRound = document.getElementById("stat-round");
  var statLast = document.getElementById("stat-last");
  var gameScreen = document.getElementById("game-screen");
  var resultScreen = document.getElementById("result-screen");
  var resultAvg = document.getElementById("result-avg");
  var resultBest = document.getElementById("result-best");
  var resultGrade = document.getElementById("result-grade");
  var restartBtn = document.getElementById("restart-btn");
  var restartBtnTop = document.getElementById("restart-btn-top");

  var state = "idle";
  var times = [];
  var round = 0;
  var waitTimeoutId = null;
  var advanceTimeoutId = null;
  var readyStartTime = null;

  function setStage(cls, text) {
    stage.className = "reaction-stage " + cls;
    stageText.textContent = text;
  }

  function clearTimers() {
    if (waitTimeoutId !== null) {
      clearTimeout(waitTimeoutId);
      waitTimeoutId = null;
    }
    if (advanceTimeoutId !== null) {
      clearTimeout(advanceTimeoutId);
      advanceTimeoutId = null;
    }
  }

  function startRound() {
    state = "waiting";
    statRound.textContent = (round + 1) + " / " + ROUNDS_TOTAL;
    setStage("state-waiting", "빨간색... 기다리세요");

    var delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    waitTimeoutId = setTimeout(function () {
      state = "ready";
      readyStartTime = performance.now();
      setStage("state-ready", "지금 클릭하세요!");
    }, delay);
  }

  function startTest() {
    times = [];
    round = 0;
    statLast.textContent = "-";
    startRound();
  }

  function finishTest() {
    state = "finished";
    GTBSfx.win();
    var sum = times.reduce(function (a, b) { return a + b; }, 0);
    var avg = Math.round(sum / times.length);
    var best = Math.min.apply(null, times);

    resultAvg.textContent = avg + "ms";
    resultBest.textContent = best + "ms";
    resultGrade.textContent = gradeFor(avg);

    gameScreen.hidden = true;
    resultScreen.hidden = false;
  }

  function gradeFor(avg) {
    if (avg <= 220) return "상위 5% ⚡";
    if (avg <= 260) return "상위 20%";
    if (avg <= 300) return "평균 수준";
    if (avg <= 350) return "평균 이하";
    return "연습이 필요해요";
  }

  function handlePress(e) {
    e.preventDefault();

    if (state === "idle") {
      startTest();
      return;
    }

    if (state === "waiting") {
      clearTimers();
      state = "early";
      GTBSfx.hit();
      setStage("state-early", "너무 빨리 눌렀어요! 다시 시도하세요");
      advanceTimeoutId = setTimeout(startRound, 1000);
      return;
    }

    if (state === "ready") {
      var elapsed = Math.round(performance.now() - readyStartTime);
      GTBSfx.select();
      times.push(elapsed);
      round++;
      statLast.textContent = elapsed + "ms";
      state = "round-result";
      setStage("state-round-result", elapsed + " ms");

      if (round >= ROUNDS_TOTAL) {
        advanceTimeoutId = setTimeout(finishTest, 900);
      } else {
        advanceTimeoutId = setTimeout(startRound, 900);
      }
      return;
    }

    // 'early', 'round-result', 'finished' 상태에서는 입력을 무시합니다.
  }

  function resetGame() {
    clearTimers();
    state = "idle";
    times = [];
    round = 0;
    statRound.textContent = "0 / " + ROUNDS_TOTAL;
    statLast.textContent = "-";
    setStage("state-idle", "화면을 탭하거나 클릭하면 시작합니다");

    gameScreen.hidden = false;
    resultScreen.hidden = true;
  }

  stage.addEventListener("pointerdown", handlePress);
  stage.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") {
      handlePress(e);
    }
  });

  restartBtn.addEventListener("click", resetGame);
  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
