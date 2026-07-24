const setupScreen = document.getElementById("setupScreen");
const setupPasswordInput = document.getElementById("setupPasswordInput");
const setupPasswordConfirm = document.getElementById("setupPasswordConfirm");
const setupBtn = document.getElementById("setupBtn");
const setupError = document.getElementById("setupError");

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordCard = document.getElementById("changePasswordCard");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const submitChangePasswordBtn = document.getElementById("submitChangePasswordBtn");
const changePasswordStatus = document.getElementById("changePasswordStatus");

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

function hideAllScreens() {
  setupScreen.hidden = true;
  loginScreen.hidden = true;
  adminPanel.hidden = true;
}

async function verifyPassword(pwd) {
  const res = await fetch("/api/admin-verify", {
    headers: { "x-admin-password": pwd },
  });
  return res.ok;
}

async function enterPanel(pwd) {
  sessionStorage.setItem("adminPassword", pwd);
  hideAllScreens();
  adminPanel.hidden = false;
  await loadConfig();
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

// ---- criar senha (primeiro acesso) ----
async function doSetup() {
  setupError.textContent = "";
  const pwd = setupPasswordInput.value;
  const confirm = setupPasswordConfirm.value;
  if (pwd.length < 6) {
    setupError.textContent = "A senha precisa ter pelo menos 6 caracteres.";
    return;
  }
  if (pwd !== confirm) {
    setupError.textContent = "As senhas não coincidem.";
    return;
  }
  setupBtn.disabled = true;
  try {
    const res = await fetch("/api/admin-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newPassword: pwd }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === "senha atual incorreta") {
        // já existe uma senha salva (ex: clique duplicado numa tentativa anterior) — manda pro login
        setupError.textContent = "Uma senha já foi criada antes. Tentando login com essa senha...";
        hideAllScreens();
        loginScreen.hidden = false;
        passwordInput.value = pwd;
        return;
      }
      setupError.textContent = data.error || "Erro ao criar senha. Tente novamente.";
      return;
    }
    await enterPanel(pwd);
  } catch {
    setupError.textContent = "Erro de conexão. Tente novamente.";
  } finally {
    setupBtn.disabled = false;
  }
}

setupBtn.addEventListener("click", doSetup);
setupPasswordConfirm.addEventListener("keydown", e => {
  if (e.key === "Enter") doSetup();
});

// ---- login ----
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
  await enterPanel(pwd);
}

loginBtn.addEventListener("click", tryLogin);
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("adminPassword");
  location.reload();
});

// ---- trocar senha (dentro do painel) ----
changePasswordBtn.addEventListener("click", () => {
  changePasswordCard.hidden = !changePasswordCard.hidden;
  changePasswordStatus.textContent = "";
});

submitChangePasswordBtn.addEventListener("click", async () => {
  changePasswordStatus.className = "admin-error";
  const current = currentPasswordInput.value;
  const next = newPasswordInput.value;
  if (next.length < 6) {
    changePasswordStatus.textContent = "A nova senha precisa ter pelo menos 6 caracteres.";
    return;
  }
  try {
    const res = await fetch("/api/admin-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      changePasswordStatus.textContent = data.error || "Erro ao trocar senha.";
      return;
    }
    sessionStorage.setItem("adminPassword", next);
    changePasswordStatus.className = "admin-status success";
    changePasswordStatus.textContent = "Senha alterada com sucesso!";
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
  } catch {
    changePasswordStatus.textContent = "Erro ao trocar senha.";
  }
});

// ---- inicialização ----
(async function init() {
  const statusRes = await fetch("/api/admin-status");
  const status = statusRes.ok ? await statusRes.json() : { hasPassword: false };

  if (!status.hasPassword) {
    hideAllScreens();
    setupScreen.hidden = false;
    return;
  }

  const stored = adminPassword();
  if (stored) {
    const ok = await verifyPassword(stored);
    if (ok) {
      hideAllScreens();
      adminPanel.hidden = false;
      await loadConfig();
      return;
    }
    sessionStorage.removeItem("adminPassword");
  }

  hideAllScreens();
  loginScreen.hidden = false;
})();
