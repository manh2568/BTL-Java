/**
 * theme.js — sáng / tối / theo hệ thống + màu nhấn (accent)
 */

const THEME_STORAGE = 'javatruyen_theme';
const ACCENT_STORAGE = 'javatruyen_accent';

function getColorMode() {
  const s = localStorage.getItem(THEME_STORAGE);
  if (s === 'light' || s === 'dark' || s === 'auto') return s;
  return 'auto';
}

function effectiveIsLight() {
  const mode = getColorMode();
  if (mode === 'light') return true;
  if (mode === 'dark') return false;
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch (_) {
    return false;
  }
}

function applyThemeToDocument() {
  const isLight = effectiveIsLight();
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  const accent = localStorage.getItem(ACCENT_STORAGE) || 'gold';
  if (accent === 'gold') {
    document.documentElement.removeAttribute('data-accent');
  } else {
    document.documentElement.setAttribute('data-accent', accent);
  }
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  btn.textContent = isLight ? '🌙' : '☀️';
  btn.title = isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
  btn.setAttribute('aria-label', btn.title);
}

function setColorMode(mode) {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') return;
  localStorage.setItem(THEME_STORAGE, mode);
  applyThemeToDocument();
  syncThemeMenuState();
}

function setAccentColor(accent) {
  const allowed = ['gold', 'ocean', 'rose', 'forest'];
  if (!allowed.includes(accent)) return;
  if (accent === 'gold') {
    localStorage.removeItem(ACCENT_STORAGE);
  } else {
    localStorage.setItem(ACCENT_STORAGE, accent);
  }
  applyThemeToDocument();
  syncThemeMenuState();
}

function toggleTheme() {
  const current = getColorMode();
  if (current === 'light') setColorMode('dark');
  else if (current === 'dark') setColorMode('light');
  else setColorMode(effectiveIsLight() ? 'dark' : 'light');
}

function syncThemeMenuState() {
  const mode = getColorMode();
  document.querySelectorAll('.theme-chip[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
  const accent = localStorage.getItem(ACCENT_STORAGE) || 'gold';
  document.querySelectorAll('.theme-swatch[data-accent]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === accent);
  });
}

function toggleThemeMenu(ev) {
  if (ev) ev.stopPropagation();
  const dd = document.getElementById('theme-dd');
  const btn = document.getElementById('btn-theme');
  if (!dd || !btn) return;
  const open = dd.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  dd.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) syncThemeMenuState();
}

function closeThemeMenu() {
  const dd = document.getElementById('theme-dd');
  const btn = document.getElementById('btn-theme');
  if (dd) dd.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (dd) dd.setAttribute('aria-hidden', 'true');
}

let themeMediaQuery = null;

function bindSystemThemeListener() {
  if (!window.matchMedia) return;
  if (themeMediaQuery) {
    try {
      themeMediaQuery.removeEventListener('change', onSystemThemeChange);
    } catch (_) {
      themeMediaQuery.removeListener(onSystemThemeChange);
    }
  }
  themeMediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  try {
    themeMediaQuery.addEventListener('change', onSystemThemeChange);
  } catch (_) {
    themeMediaQuery.addListener(onSystemThemeChange);
  }
}

function onSystemThemeChange() {
  if (getColorMode() !== 'auto') return;
  applyThemeToDocument();
}

function initThemeUi() {
  applyThemeToDocument();
  syncThemeMenuState();
  bindSystemThemeListener();

  document.addEventListener('click', e => {
    const wrap = document.getElementById('theme-wrap');
    if (wrap && !wrap.contains(e.target)) closeThemeMenu();
  });
}

window.setColorMode = setColorMode;
window.setAccentColor = setAccentColor;
window.toggleTheme = toggleTheme;
window.toggleThemeMenu = toggleThemeMenu;
window.closeThemeMenu = closeThemeMenu;

if (document.getElementById('btn-theme')) {
  initThemeUi();
} else {
  window.addEventListener('partials:loaded', initThemeUi, { once: true });
}
