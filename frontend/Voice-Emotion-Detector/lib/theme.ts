// Shared by the server layout and the client ThemeToggle, so it must not be a client module.
export const THEME_STORAGE_KEY = "voice-emotion-theme";

/** Inline script for <head>: applies the saved theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
