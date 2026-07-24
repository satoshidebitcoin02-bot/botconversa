const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const logoTextInput = document.getElementById("logoTextInput");
const logoImageInput = document.getElementById("logoImageInput");
const backgroundInput = document.getElementById("backgroundInput");
const backgroundPreview = document.getElementById("backgroundPreview");
const soundsToggle = document.getElementById("soundsToggle");
const personaList = document.getElementById("personaList");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");

let currentConfig = {};

function adminPassword() {
  return sessionStorage.getItem("adminPassword") || "";
}

async function verifyPassword(pwd) {
  const res = await fetch("/api/admin-verify", {
    headers: { "x-admin-password": pwd },
  });
  return res.ok;
}

async function loadConfig() {
  const res = await fetch("/api/config");
  currentConfig = res.ok ? await res.json() : {};
  populateForm();
}

function populateForm() {
  const logo = currentConfig.logo || { type: "text", value: "chats" };
  document.querySelector(`input[name="logoType"][value="${logo.type}"]`).checked = true;
  if (logo.type === "image") {
    logoImageInput.value = logo.value || "";
    logoImageInput.hidden = false;
    logoTextInput.hidden = true;
  } else {
    logoTextInput.value = logo.value || "chats";
  }

  backgroundInput.value = currentConfig.background || "";
  updateBgPreview();

  soundsToggle.checked = currentConfig.soundsEnabled !== false;

  const overrides = currentConfig.personas || {};
  personaList.innerHTML = PERSONAS.map(p => {
    const o = overrides[p.id] || {};
    const name = o.name || p.name;
    const avatar = o.avatar || p.avatar;
    const opener = o.opener || p.opener;
    return `
      <div class="admin-persona-card" data-id="${p.id}">
        <img src="${avatar}" alt="${name}" class="persona-avatar-preview" />
        <div class="admin-persona-fields">
          <div>
            <label>Nome</label>
            <input type="text" class="p-name" value="${name.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label>Foto (URL)</label>
            <input type="text" class="p-avatar" value="${avatar.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label>Primeira mensagem</label>
            <textarea class="p-opener" rows="2">${opener}</textarea>
          </div>
        </div>
      </div>
    `;
  }).join("");

  personaList.querySelectorAll(".p-avatar").forEach(input => {
    input.addEventListener("input", () => {
      const img = input.closest(".admin-persona-card").querySelector("img");
      img.src = input.value;
    });
  });
}

function updateBgPreview() {
  backgroundPreview.style.backgroundImage = backgroundInput.value
    ? `url("${backgroundInput.value}")`
    : "none";
}

backgroundInput.addEventListener("input", updateBgPreview);

document.querySelectorAll('input[name="logoType"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isImage = document.querySelector('input[name="logoType"]:checked').value === "image";
    logoImageInput.hidden = !isImage;
    logoTextInput.hidden = isImage;
  });
});

function buildConfigFromForm() {
  const logoType = document.querySelector('input[name="logoType"]:checked').value;
  const config = {
    logo: {
      type: logoType,
      value: logoType === "image" ? logoImageInput.value.trim() : logoTextInput.value.trim(),
    },
    background: backgroundInput.value.trim(),
    soundsEnabled: soundsToggle.checked,
    personas: {},
  };

  personaList.querySelectorAll(".admin-persona-card").forEach(card => {
    const id = card.dataset.id;
    config.personas[id] = {
      name: card.querySelector(".p-name").value.trim(),
      avatar: card.querySelector(".p-avatar").value.trim(),
      opener: card.querySelector(".p-opener").value.trim(),
    };
  });

  return config;
}

async function save() {
  saveStatus.textContent = "Salvando...";
  saveStatus.className = "admin-status";
  const config = buildConfigFromForm();
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-password": adminPassword(),
      },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error();
    currentConfig = config;
    saveStatus.textContent = "Salvo com sucesso!";
    saveStatus.className = "admin-status success";
  } catch {
    saveStatus.textContent = "Erro ao salvar. Tente novamente.";
    saveStatus.className = "admin-status error";
  }
}

saveBtn.addEventListener("click", save);

async function tryLogin() {
  const pwd = passwordInput.value;
  loginError.textContent = "";
  loginBtn.disabled = true;
  const ok = await verifyPassword(pwd);
  loginBtn.disabled = false;
  if (!ok) {
    loginError.textContent = "Senha incorreta.";
    return;
  }
  sessionStorage.setItem("adminPassword", pwd);
  loginScreen.hidden = true;
  adminPanel.hidden = false;
  await loadConfig();
}

loginBtn.addEventListener("click", tryLogin);
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("adminPassword");
  location.reload();
});

// tenta reaproveitar sessão já autenticada
(async function init() {
  const stored = adminPassword();
  if (!stored) return;
  const ok = await verifyPassword(stored);
  if (ok) {
    loginScreen.hidden = true;
    adminPanel.hidden = false;
    await loadConfig();
  } else {
    sessionStorage.removeItem("adminPassword");
  }
})();
