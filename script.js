// Página de lista — monta stories e lista de conversas com as personas de IA.

function renderStories(personas) {
  const el = document.getElementById("stories");
  el.innerHTML = personas.map(p => `
    <div class="story" onclick="location.href='chat.html?id=${p.id}'">
      <div class="avatar-wrap">
        <span class="ai-tag">IA</span>
        <img src="${p.avatar}" alt="${p.name}" />
        <span class="dot"></span>
      </div>
      <span>${p.name}</span>
    </div>
  `).join("");
}

function renderConvoList(personas) {
  const el = document.getElementById("convoList");
  el.innerHTML = personas.map(p => `
    <div class="convo" onclick="location.href='chat.html?id=${p.id}'">
      <div class="avatar-wrap">
        <img src="${p.avatar}" alt="${p.name}" />
        <span class="dot"></span>
      </div>
      <div class="body">
        <div class="name-row">
          <span>${p.name}</span>
          <span class="ai-pill">IA</span>
        </div>
        <div class="preview">${p.opener}</div>
      </div>
      <div class="time">agora</div>
    </div>
  `).join("");
}

(async function init() {
  const config = await loadSiteConfig();
  const personas = mergedPersonas(config);
  applyLogo(config);
  renderStories(personas);
  renderConvoList(personas);
})();
