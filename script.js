// Página de lista — monta stories e lista de conversas com as personas de IA.

let siteConfig = {};
let adGateTimerInterval = null;
let pendingChatUrl = null;

function renderConvoList(personas) {
  const el = document.getElementById("convoList");
  el.innerHTML = personas.map(p => `
    <div class="convo" data-chat-id="${p.id}">
      <div class="avatar-wrap">
        <img src="${p.avatar}" alt="${p.name}" />
        <span class="dot"></span>
      </div>
      <div class="body">
        <div class="name-row">
          <span>${p.name}</span>
          <span class="ai-pill">BOT</span>
        </div>
        <div class="preview">${p.opener}</div>
      </div>
      <div class="time">agora</div>
    </div>
  `).join("");
}

function openAdGate(chatUrl) {
  const ad = siteConfig.interstitialAd;
  if (!ad || !ad.enabled || !ad.code) {
    location.href = chatUrl;
    return;
  }

  pendingChatUrl = chatUrl;
  const overlay      = document.getElementById("adGate");
  const content      = document.getElementById("adGateContent");
  const timerEl      = document.getElementById("adGateTimer");
  const btn          = document.getElementById("adGateBtn");
  const waitTextEl   = document.getElementById("adGateWaitText");

  content.innerHTML = "";
  btn.hidden = true;
  timerEl.textContent = "";
  if (ad.waitText) {
    waitTextEl.textContent = ad.waitText;
    waitTextEl.hidden = false;
  } else {
    waitTextEl.hidden = true;
  }
  if (adGateTimerInterval) clearInterval(adGateTimerInterval);

  // Injeta o código do anúncio de forma que scripts sejam executados
  const frag = document.createRange().createContextualFragment(ad.code);
  content.appendChild(frag);

  overlay.hidden = false;

  let secs = Math.max(0, Number(ad.seconds) || 0);

  function tick() {
    if (secs <= 0) {
      clearInterval(adGateTimerInterval);
      adGateTimerInterval = null;
      timerEl.textContent = "";
      btn.hidden = false;
      return;
    }
    timerEl.textContent = `Aguarde ${secs}s…`;
    secs--;
  }

  tick();
  if (secs > 0 || btn.hidden) {
    adGateTimerInterval = setInterval(tick, 1000);
  }
}

document.getElementById("adGateBtn").addEventListener("click", () => {
  if (pendingChatUrl) location.href = pendingChatUrl;
});

document.addEventListener("click", e => {
  const el = e.target.closest("[data-chat-id]");
  if (!el) return;
  openAdGate(`chat.html?id=${el.dataset.chatId}`);
});

(async function init() {
  try {
    const config = await loadSiteConfig();
    siteConfig = config;
    applyLogo(config);
    applyColors(config);
    renderStories(mergedPersonas(config));
    renderConvoList(mergedPersonas(config));
  } catch {
    // config falhou — renderiza vazio, não mostra defaults
  } finally {
    document.getElementById("stories").hidden = false;
    document.getElementById("convoScroll").hidden = false;
  }
})();
