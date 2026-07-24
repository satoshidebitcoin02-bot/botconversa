// Mantém o app travado na altura real da viewport visível quando o teclado
// virtual do celular abre (necessário principalmente no iOS Safari, que não
// suporta "interactive-widget=resizes-content" e em vez disso desloca a
// página inteira ao focar um input).

(function () {
  const vv = window.visualViewport;
  if (!vv) return;

  function applyViewportHeight() {
    document.documentElement.style.height = vv.height + "px";
    document.body.style.height = vv.height + "px";
    window.scrollTo(0, 0);
  }

  vv.addEventListener("resize", applyViewportHeight);
  vv.addEventListener("scroll", () => window.scrollTo(0, 0));
  applyViewportHeight();
})();
