const logoTextInput = document.getElementById("logoTextInput");
const logoImageGroup = document.getElementById("logoImageGroup");
const logoImageInput = document.getElementById("logoImageInput");
const logoImageFile = document.getElementById("logoImageFile");
const backgroundInput = document.getElementById("backgroundInput");
const backgroundFile = document.getElementById("backgroundFile");
const backgroundPreview = document.getElementById("backgroundPreview");
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
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

activateTab(localStorage.getItem(TAB_STORAGE_KEY) || "appearance");

// ---- carregar / popular ----
async function loadConfig() {
  const res = await fetch("/api/config");
  currentConfig = res.ok ? await res.json() : {};

  personasDraft = mergedPersonas(currentConfig).map(p => ({ ...p }));
  window.PERSONAS_FOR_ADMIN = personasDraft;

  populateAppearance();
  renderPersonaList();

  flowsDraft = JSON.parse(JSON.stringify(currentConfig.flows || {}));
  renderFlowsList();
  initFlowsTab();
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

  soundsToggle.checked = currentConfig.soundsEnabled !== false;
}

function updateBgPreview() {
  backgroundPreview.style.backgroundImage = backgroundInput.value ? `url("${backgroundInput.value}")` : "none";
}

backgroundInput.addEventListener("input", updateBgPreview);
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
          <label>Primeira mensagem (usada só se nenhum fluxo estiver associado a este personagem)</label>
          <textarea class="p-opener" rows="2">${p.opener || ""}</textarea>
        </div>
      </div>
      <button type="button" class="admin-secondary-btn remove-persona-btn" title="Remover personagem">${icon("trash", 14)}</button>
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

  personaList.querySelectorAll(".p-name, .p-opener").forEach(input => {
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
    soundsEnabled: soundsToggle.checked,
    personasList: personasDraft,
    flows: flowsDraft,
  };
}

async function saveAll() {
  const statuses = [document.getElementById("saveStatus"), document.getElementById("saveStatusPersonas")].filter(Boolean);
  statuses.forEach(s => { s.textContent = "Salvando..."; s.className = "admin-status"; });

  const config = buildConfigFromForm();
  try {
    const res = await fetch("/api/config", {
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

loadConfig();
