/** Inline script, вставляється в <head> для усунення flash. */
export const THEME_BOOT_SCRIPT = `(function(){
  try {
    var m = document.cookie.match(/(?:^|;\\s*)calories_theme=([^;]+)/);
    if (m && m[1]) document.documentElement.setAttribute('data-theme', decodeURIComponent(m[1]));
  } catch(e){}
})();`;
