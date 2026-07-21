/* GameToolbox 공통 효과음 유틸 (Web Audio API, 외부 파일 없음) */
window.GTBSfx = (function () {
  "use strict";

  var STORAGE_KEY = "gtb-sfx-muted";
  var ctx = null;
  var muted = localStorage.getItem(STORAGE_KEY) === "1";

  function getCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, gain) {
    if (muted) return;
    var c = getCtx();
    if (!c) return;
    try {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      var vol = gain != null ? gain : 0.07;
      var now = c.currentTime;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      /* 오디오를 사용할 수 없는 환경은 조용히 무시 */
    }
  }

  function setMuted(v) {
    muted = v;
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }

  var api = {
    move: function () { tone(220, 0.05, "square", 0.045); },
    select: function () { tone(440, 0.045, "square", 0.05); },
    rotate: function () { tone(330, 0.06, "square", 0.055); },
    drop: function () { tone(140, 0.09, "square", 0.07); },
    clear: function () { tone(660, 0.15, "triangle", 0.08); },
    hit: function () { tone(140, 0.16, "sawtooth", 0.09); },
    shoot: function () { tone(880, 0.035, "square", 0.028); },
    explode: function () { tone(90, 0.18, "sawtooth", 0.11); },
    eat: function () { tone(520, 0.07, "square", 0.06); },
    merge: function () { tone(600, 0.08, "triangle", 0.07); },
    flag: function () { tone(390, 0.05, "square", 0.05); },
    win: function () {
      tone(880, 0.12, "triangle", 0.09);
      setTimeout(function () { tone(1175, 0.2, "triangle", 0.09); }, 110);
    },
    gameover: function () { tone(196, 0.28, "sawtooth", 0.09); },
    isMuted: function () { return muted; },
    setMuted: setMuted
  };

  document.addEventListener("DOMContentLoaded", function () {
    var navLinks = document.querySelector(".nav-links");
    if (!navLinks) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "효과음 켜기/끄기");

    function updateIcon() {
      btn.textContent = muted ? "🔇" : "🔊";
    }
    updateIcon();

    btn.addEventListener("click", function () {
      setMuted(!muted);
      updateIcon();
      if (!muted) api.select();
    });

    var themeBtn = navLinks.querySelector("[data-theme-toggle]");
    if (themeBtn) {
      navLinks.insertBefore(btn, themeBtn);
    } else {
      navLinks.appendChild(btn);
    }
  });

  return api;
})();
