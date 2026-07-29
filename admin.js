const logoTextInput = document.getElementById("logoTextInput");
const logoImageGroup = document.getElementById("logoImageGroup");
const logoImageInput = document.getElementById("logoImageInput");
const logoImageFile = document.getElementById("logoImageFile");
const backgroundInput = document.getElementById("backgroundInput");
const backgroundFile = document.getElementById("backgroundFile");
const backgroundPreview = document.getElementById("backgroundPreview");
const removeBgBtn = document.getElementById("removeBgBtn");
const soundsToggle = document.getElementById("soundsToggle");
const personaList = document.getElementById("personaList");

let currentConfig = {};
let personasDraft = []; // [{id, name, avatar, opener}]

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- abas (persistem entre reloads via localStorage) ----
const TAB_STORAGE_KEY = "adminActiveTab";

function activateTab(tabName) {
  const btn = document.querySelector(`.admin-tab-btn[data-tab="${tabName}"]`);
  if (!btn) return;
  document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".admin-tab-panel").forEach(p => (p.hidden = true));
  document.getElementById(`tab-${tabName}`).hidden = false;
  localStorage.setItem(TAB_STORAGE_KEY, tabName);
}

document.querySelectorAll(".admin-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const leavingFlows = document.getElementById("tab-flows") && !document.getElementById("tab-flows").hidden;
    if (leavingFlows && btn.dataset.tab !== "flows" && typeof confirmDiscardFlowChanges === "function") {
      if (!confirmDiscardFlowChanges()) return;
      flowDirty = false;
    }
    activateTab(btn.dataset.tab);
  });
});

activateTab(localStorage.getItem(TAB_STORAGE_KEY) || "appearance");

// ---- carregar / popular ----
function adminConfigUrl() {
  const siteId = typeof getSiteId === "function" ? getSiteId() : null;
  return siteId ? `/api/config?site=${encodeURIComponent(siteId)}` : "/api/config";
}

async function loadConfig() {
  const res = await fetch(adminConfigUrl());
  currentConfig = res.ok ? await res.json() : {};

  personasDraft = mergedPersonas(currentConfig).map(p => ({ ...p }));
  window.PERSONAS_FOR_ADMIN = personasDraft;

  populateAppearance();
  renderPersonaList();

  flowsDraft = JSON.parse(JSON.stringify(currentConfig.flows || {}));
  renderFlowsList();
  initFlowsTab();
  renderCampaignList();
}

function populateAppearance() {
  const logo = currentConfig.logo || { type: "text", value: "chats" };
  document.querySelector(`input[name="logoType"][value="${logo.type}"]`).checked = true;
  if (logo.type === "image") {
    logoImageInput.value = logo.value || "";
    logoImageGroup.hidden = false;
    logoTextInput.hidden = true;
  } else {
    logoTextInput.value = logo.value || "chats";
  }

  backgroundInput.value = currentConfig.background || "";
  updateBgPreview();

  const defaults = { bg:"#ffffff", bgAlt:"#f5f6f7", blue:"#0084ff", text:"#050505", bubbleThem:"#ffffff", bubbleMeFrom:"#12a1ff", bubbleMeTo:"#7a4dff" };
  const savedColors = currentConfig.colors || {};
  for (const [key, def] of Object.entries(defaults)) {
    const el = document.getElementById("color" + key.charAt(0).toUpperCase() + key.slice(1));
    if (el) el.value = savedColors[key] || def;
  }

  soundsToggle.checked = currentConfig.soundsEnabled !== false;

  const ad = currentConfig.interstitialAd || {};
  document.getElementById("interstitialEnabled").checked = !!ad.enabled;
  document.getElementById("interstitialCode").value = ad.code || "";
  document.getElementById("interstitialSeconds").value = ad.seconds ?? 5;
  document.getElementById("interstitialWaitText").value = ad.waitText || "";
}

function updateBgPreview() {
  const has = !!backgroundInput.value;
  backgroundPreview.style.backgroundImage = has ? `url("${backgroundInput.value}")` : "none";
  removeBgBtn.hidden = !has;
}

const COLOR_DEFAULTS = { bg:"#ffffff", bgAlt:"#f5f6f7", blue:"#0084ff", text:"#050505", bubbleThem:"#ffffff", bubbleMeFrom:"#12a1ff", bubbleMeTo:"#7a4dff" };

document.getElementById("resetColorsBtn").addEventListener("click", () => {
  for (const [key, def] of Object.entries(COLOR_DEFAULTS)) {
    const el = document.getElementById("color" + key.charAt(0).toUpperCase() + key.slice(1));
    if (el) el.value = def;
  }
});

backgroundInput.addEventListener("input", updateBgPreview);
removeBgBtn.addEventListener("click", () => {
  backgroundInput.value = "";
  backgroundFile.value = "";
  updateBgPreview();
});

backgroundFile.addEventListener("change", async () => {
  const file = backgroundFile.files[0];
  if (!file) return;
  backgroundInput.value = await readFileAsDataUrl(file);
  updateBgPreview();
});

logoImageFile.addEventListener("change", async () => {
  const file = logoImageFile.files[0];
  if (!file) return;
  logoImageInput.value = await readFileAsDataUrl(file);
});

document.querySelectorAll('input[name="logoType"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isImage = document.querySelector('input[name="logoType"]:checked').value === "image";
    logoImageGroup.hidden = !isImage;
    logoTextInput.hidden = isImage;
  });
});

// ---- personagens (CRUD dinâmico) ----
function renderPersonaList() {
  personaList.innerHTML = personasDraft.map(p => `
    <div class="admin-persona-card" data-id="${p.id}">
      <img src="${p.avatar}" alt="${p.name}" class="persona-avatar-preview" />
      <div class="admin-persona-fields">
        <div>
          <label>Nome</label>
          <input type="text" class="p-name" value="${(p.name || "").replace(/"/g, "&quot;")}" />
        </div>
        <div>
          <label>Foto</label>
          <input type="hidden" class="p-avatar" value="${(p.avatar || "").replace(/"/g, "&quot;")}" />
          <label class="admin-upload-btn">
            ${icon("folder", 12)} Enviar arquivo
            <input type="file" accept="image/*" class="p-avatar-file" hidden />
          </label>
        </div>
        <div>
          <label>Horário na lista de conversas</label>
          <input type="text" class="p-time" placeholder="agora" value="${(p.time || "").replace(/"/g, "&quot;")}" />
        </div>
        <div>
          <label>Primeira mensagem (usada só se nenhum fluxo estiver associado a este personagem)</label>
          <textarea class="p-opener" rows="2">${p.opener || ""}</textarea>
        </div>
      </div>
      <div class="admin-persona-actions">
        <a href="chat.html?id=${p.id}" target="_blank" class="admin-secondary-btn admin-test-chat-btn" title="Testar chat com este personagem">${icon("message", 14)} Testar</a>
        <button type="button" class="admin-secondary-btn remove-persona-btn" title="Remover personagem">${icon("trash", 14)}</button>
      </div>
    </div>
  `).join("");

  personaList.querySelectorAll(".p-avatar").forEach(input => {
    input.addEventListener("input", () => {
      const card = input.closest(".admin-persona-card");
      card.querySelector("img").src = input.value;
      updatePersonaDraftFromCard(card);
    });
  });

  personaList.querySelectorAll(".p-avatar-file").forEach(fileInput => {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const card = fileInput.closest(".admin-persona-card");
      card.querySelector(".p-avatar").value = dataUrl;
      card.querySelector("img").src = dataUrl;
      updatePersonaDraftFromCard(card);
    });
  });

  personaList.querySelectorAll(".p-name, .p-opener, .p-time").forEach(input => {
    input.addEventListener("input", () => updatePersonaDraftFromCard(input.closest(".admin-persona-card")));
  });

  personaList.querySelectorAll(".remove-persona-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".admin-persona-card").dataset.id;
      if (!confirm("Remover este personagem? Ele também será desvinculado de qualquer fluxo.")) return;
      personasDraft = personasDraft.filter(p => p.id !== id);
      Object.values(flowsDraft).forEach(f => {
        f.personaIds = (f.personaIds || []).filter(pid => pid !== id);
      });
      window.PERSONAS_FOR_ADMIN = personasDraft;
      renderPersonaList();
    });
  });
}

function updatePersonaDraftFromCard(card) {
  const id = card.dataset.id;
  const p = personasDraft.find(x => x.id === id);
  if (!p) return;
  p.name = card.querySelector(".p-name").value.trim();
  p.avatar = card.querySelector(".p-avatar").value.trim();
  p.time = card.querySelector(".p-time").value.trim();
  p.opener = card.querySelector(".p-opener").value.trim();
  window.PERSONAS_FOR_ADMIN = personasDraft;
}

document.getElementById("addPersonaBtn").addEventListener("click", () => {
  personasDraft.push({
    id: uid(),
    name: "Novo personagem",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + Math.random().toString(36).slice(2),
    opener: "Oi! Tudo bem?",
  });
  window.PERSONAS_FOR_ADMIN = personasDraft;
  renderPersonaList();
});

// ---- salvar (todas as abas gravam no mesmo config) ----
function buildConfigFromForm() {
  const logoType = document.querySelector('input[name="logoType"]:checked').value;
  return {
    logo: {
      type: logoType,
      value: logoType === "image" ? logoImageInput.value.trim() : logoTextInput.value.trim(),
    },
    background: backgroundInput.value.trim(),
    colors: {
      bg:           document.getElementById("colorBg").value,
      bgAlt:        document.getElementById("colorBgAlt").value,
      blue:         document.getElementById("colorBlue").value,
      text:         document.getElementById("colorText").value,
      bubbleThem:   document.getElementById("colorBubbleThem").value,
      bubbleMeFrom: document.getElementById("colorBubbleMeFrom").value,
      bubbleMeTo:   document.getElementById("colorBubbleMeTo").value,
    },
    soundsEnabled: soundsToggle.checked,
    personasList: personasDraft,
    flows: flowsDraft,
    interstitialAd: {
      enabled: document.getElementById("interstitialEnabled").checked,
      code: document.getElementById("interstitialCode").value.trim(),
      seconds: Number(document.getElementById("interstitialSeconds").value) || 0,
      waitText: document.getElementById("interstitialWaitText").value.trim(),
    },
  };
}

async function saveAll() {
  const statuses = [
    document.getElementById("saveStatus"),
    document.getElementById("saveStatusPersonas"),
    document.getElementById("saveStatusAds"),
  ].filter(Boolean);
  statuses.forEach(s => { s.textContent = "Salvando..."; s.className = "admin-status"; });

  const config = buildConfigFromForm();
  try {
    const res = await fetch(adminConfigUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error();
    currentConfig = config;
    statuses.forEach(s => { s.textContent = "Salvo com sucesso!"; s.className = "admin-status success"; });
  } catch {
    statuses.forEach(s => { s.textContent = "Erro ao salvar. Tente novamente."; s.className = "admin-status error"; });
  }
}

document.getElementById("saveBtn").addEventListener("click", saveAll);
document.getElementById("saveBtnPersonas").addEventListener("click", saveAll);
document.getElementById("saveBtnAds").addEventListener("click", saveAll);

// ---- campanhas ----
function renderCampaignList() {
  const list = document.getElementById("campaignList");
  const campaigns = currentConfig.campaigns || [];
  if (!campaigns.length) {
    list.innerHTML = `<p style="font-size:13px;color:var(--text-dim)">Nenhuma campanha criada ainda.</p>`;
    return;
  }
  const origin = location.origin;
  list.innerHTML = campaigns.map(slug => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">/${slug}</div>
        <div style="font-size:12px;color:var(--text-dim);word-break:break-all">${origin}/${slug}</div>
      </div>
      <a href="/${slug}/admin.html" target="_blank" class="admin-secondary-btn" style="white-space:nowrap">Configurar</a>
      <a href="/${slug}/" target="_blank" class="admin-secondary-btn" style="white-space:nowrap">Ver chat</a>
      <button type="button" class="admin-secondary-btn remove-campaign-btn" data-slug="${slug}" title="Remover">✕</button>
    </div>
  `).join("");

  list.querySelectorAll(".remove-campaign-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const slug = btn.dataset.slug;
      if (!confirm(`Remover campanha "/${slug}"? O conteúdo configurado no KV não será apagado automaticamente.`)) return;
      currentConfig.campaigns = (currentConfig.campaigns || []).filter(s => s !== slug);
      await fetch(adminConfigUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(currentConfig),
      });
      renderCampaignList();
    });
  });
}

document.getElementById("addCampaignBtn").addEventListener("click", async () => {
  const input = document.getElementById("campaignSlugInput");
  const slug = input.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!slug) return;
  const campaigns = currentConfig.campaigns || [];
  if (campaigns.includes(slug)) { alert("Essa campanha já existe."); return; }
  campaigns.push(slug);
  currentConfig.campaigns = campaigns;
  await fetch("/api/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(currentConfig),
  });
  input.value = "";
  renderCampaignList();
});

loadConfig();
