// Helper pra usar os ícones do sprite (ver icon-sprite.html embutido em cada
// página) dentro de strings de template JS.
function icon(name, size) {
  const s = size || 16;
  return `<svg class="icon" width="${s}" height="${s}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}
