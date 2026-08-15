export const THEME_BOOT_SCRIPT = `(function(){
  try {
    var m = document.cookie.match(/(?:^|;\\s*)calories_theme=([^;]+)/);
    var t = m && m[1] ? decodeURIComponent(m[1]) : '';
    if (t === 'nocturne' || t === 'minecraft' || t === 'forest') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e){}
})();`;

