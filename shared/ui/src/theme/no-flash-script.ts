/**
 * No-flash-of-wrong-theme snippet per standards/design-system.md: "theme
 * is resolved before first paint (inline script or SSR cookie read, not a
 * client-side effect after hydration)." A product's root layout embeds
 * this as a raw inline `<script>` (before any styled content renders) —
 * it can't be a module import since it must run synchronously, blocking,
 * before paint.
 */
export const NO_FLASH_THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
