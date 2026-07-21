/* GameToolbox 공통 스크립트: 다크모드 토글 */
(function () {
  var STORAGE_KEY = "gtb-theme";
  var root = document.documentElement;

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function currentTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  applyTheme(localStorage.getItem(STORAGE_KEY));

  document.addEventListener("DOMContentLoaded", function () {
    var toggleBtn = document.querySelector("[data-theme-toggle]");
    if (!toggleBtn) return;

    function updateIcon() {
      toggleBtn.textContent = currentTheme() === "dark" ? "☀️" : "🌙";
    }
    updateIcon();

    toggleBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      updateIcon();
    });
  });
})();
