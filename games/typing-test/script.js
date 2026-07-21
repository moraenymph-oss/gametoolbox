/* 타이핑 속도 테스트 게임 로직 */
(function () {
  "use strict";

  var SENTENCES_KO = [
    "오늘 회의는 오후 세 시로 예정되어 있으니 늦지 않게 참석해 주세요.",
    "커피 한 잔의 여유가 하루의 업무 능률을 크게 끌어올려 줍니다.",
    "버그를 하나 고치다 보면 새로운 버그가 또 생기는 법이다.",
    "월요일 아침 스탠드업 미팅에서 어제의 진행 상황을 공유했다.",
    "코드 리뷰는 실력을 키우는 가장 빠른 지름길 중 하나다.",
    "배포하기 전에는 반드시 테스트 코드를 다시 한번 실행해야 한다.",
    "점심시간이 되면 조용하던 사무실이 갑자기 활기를 띠기 시작한다.",
    "깃허브에 커밋 메시지를 명확하게 작성하는 습관이 매우 중요하다.",
    "재택근무를 하면 출퇴근 시간이 줄어들어 마음의 여유가 생긴다.",
    "새로운 프로젝트를 시작할 때는 언제나 설렘과 부담이 공존한다.",
    "문서를 정리하는 시간이 개발하는 시간만큼 소중할 때가 많다.",
    "퇴근한 뒤에도 머릿속에서 코드가 자꾸 맴도는 것은 직업병이다.",
    "팀원들과의 원활한 소통이 프로젝트 성공을 가르는 핵심 요소이다.",
    "긴 하루의 끝에는 짧은 게임 한 판이 뜻밖에 큰 위로가 되어준다.",
    "마감 기한이 다가올수록 집중력은 오히려 더 날카로워지곤 한다.",
    "회의 자료는 미리 공유해야 참석자들이 준비할 시간을 가질 수 있다."
  ];

  var SENTENCES_EN = [
    "The quick standup meeting somehow always runs fifteen minutes over.",
    "Please review my pull request before you leave for lunch today.",
    "Coffee is the fuel that keeps most software engineers running.",
    "Remember to write clear commit messages for your teammates.",
    "Debugging is like being a detective in a crime movie you wrote.",
    "Always double check your code before pushing to production.",
    "A good night of sleep improves focus more than another coffee.",
    "The deadline is approaching faster than the coffee machine can brew.",
    "Working from home means the commute is just a few steps away.",
    "Clean code always looks like it was written by someone who cares.",
    "Take a short break every hour to keep your mind fresh and sharp.",
    "The best error message is the one that never needs to appear.",
    "Version control saves you when everything else seems to fail.",
    "A well written test suite is worth more than a thousand promises.",
    "Great teamwork can turn a difficult project into an easy win.",
    "Ship small changes often instead of one giant risky release."
  ];

  var sentenceDisplay = document.getElementById("sentence-display");
  var input = document.getElementById("typing-input");
  var statTime = document.getElementById("stat-time");
  var statProgress = document.getElementById("stat-progress");
  var gameScreen = document.getElementById("game-screen");
  var resultScreen = document.getElementById("result-screen");
  var resultWpm = document.getElementById("result-wpm");
  var resultAccuracy = document.getElementById("result-accuracy");
  var resultTime = document.getElementById("result-time");
  var restartBtn = document.getElementById("restart-btn");
  var restartBtnTop = document.getElementById("restart-btn-top");

  var currentSentence = "";
  var startTime = null;
  var timerHandle = null;
  var finished = false;

  function pickSentence() {
    var pool = Math.random() < 0.5 ? SENTENCES_KO : SENTENCES_EN;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderSentence(sentence) {
    var html = "";
    for (var i = 0; i < sentence.length; i++) {
      var cls = i === 0 ? "char current" : "char pending";
      html += '<span class="' + cls + '">' + escapeHtml(sentence[i]) + "</span>";
    }
    sentenceDisplay.innerHTML = html;
  }

  function escapeHtml(ch) {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === " ") return " ";
    return ch;
  }

  function updateDisplay(typed) {
    var spans = sentenceDisplay.children;
    var len = currentSentence.length;
    for (var i = 0; i < len; i++) {
      var span = spans[i];
      if (i < typed.length) {
        span.className = "char " + (typed[i] === currentSentence[i] ? "correct" : "incorrect");
      } else if (i === typed.length) {
        span.className = "char current";
      } else {
        span.className = "char pending";
      }
    }
  }

  function updateStats(typed) {
    var progress = Math.min(100, Math.round((typed.length / currentSentence.length) * 100));
    statProgress.textContent = progress + "%";
    if (startTime !== null) {
      var elapsed = (performance.now() - startTime) / 1000;
      statTime.textContent = elapsed.toFixed(1) + "s";
    }
  }

  function startTimerLoop() {
    stopTimerLoop();
    timerHandle = setInterval(function () {
      if (startTime === null) return;
      var elapsed = (performance.now() - startTime) / 1000;
      statTime.textContent = elapsed.toFixed(1) + "s";
    }, 100);
  }

  function stopTimerLoop() {
    if (timerHandle !== null) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function finishGame(typedRaw) {
    finished = true;
    GTBSfx.win();
    stopTimerLoop();
    input.readOnly = true;

    var typed = typedRaw.slice(0, currentSentence.length);
    var elapsedSeconds = startTime !== null ? (performance.now() - startTime) / 1000 : 0;
    if (elapsedSeconds < 0.1) elapsedSeconds = 0.1;
    var minutes = elapsedSeconds / 60;

    var correctChars = 0;
    for (var i = 0; i < typed.length; i++) {
      if (typed[i] === currentSentence[i]) correctChars++;
    }
    var accuracy = Math.round((correctChars / currentSentence.length) * 100);
    var wpm = Math.round((correctChars / 5) / minutes);

    resultWpm.textContent = wpm;
    resultAccuracy.textContent = accuracy + "%";
    resultTime.textContent = elapsedSeconds.toFixed(1) + "s";

    gameScreen.hidden = true;
    resultScreen.hidden = false;
  }

  function resetGame() {
    finished = false;
    startTime = null;
    stopTimerLoop();
    currentSentence = pickSentence();
    renderSentence(currentSentence);
    statTime.textContent = "0.0s";
    statProgress.textContent = "0%";

    input.readOnly = false;
    input.value = "";
    gameScreen.hidden = false;
    resultScreen.hidden = true;

    input.focus();
  }

  input.addEventListener("input", function () {
    if (finished) return;

    if (startTime === null) {
      startTime = performance.now();
      startTimerLoop();
    }

    var typed = input.value;

    if (typed.length >= currentSentence.length) {
      updateDisplay(typed.slice(0, currentSentence.length));
      updateStats(typed);
      finishGame(typed);
      return;
    }

    updateDisplay(typed);
    updateStats(typed);
  });

  input.addEventListener("paste", function (e) {
    e.preventDefault();
  });

  restartBtn.addEventListener("click", resetGame);
  restartBtnTop.addEventListener("click", resetGame);

  resetGame();
})();
