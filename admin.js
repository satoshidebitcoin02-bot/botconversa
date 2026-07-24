const logoTextInput = document.getElementById("logoTextInput");
const logoImageGroup = document.getElementById("logoImageGroup");
const logoImageInput = document.getElementById("logoImageInput");
const logoImageFile = document.getElementById("logoImageFile");
const backgroundInput = document.getElementById("backgroundInput");
const backgroundFile = document.getElementById("backgroundFile");
const backgroundPreview = document.getElementById("backgroundPreview");
const soundsToggle = document.getElementById("soundsToggle");
const personaList = document.getElementById("personaList");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");

let currentConfig = {};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
    logoImageGroup.hidden = false;
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
            <label>Foto (URL ou arquivo)</label>
            <input type="text" class="p-avatar" value="${avatar.replace(/"/g, "&quot;")}" />
            <label class="admin-upload-btn">
              📁 Enviar arquivo
              <input type="file" accept="image/*" class="p-avatar-file" hidden />
            </label>
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

  personaList.querySelectorAll(".p-avatar-file").forEach(fileInput => {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const card = fileInput.closest(".admin-persona-card");
      card.querySelector(".p-avatar").value = dataUrl;
      card.querySelector("img").src = dataUrl;
    });
  });
}

function updateBgPreview() {
  backgroundPreview.style.backgroundImage = backgroundInput.value
    ? `url("${backgroundInput.value}")`
    : "none";
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
      headers: { "content-type": "application/json" },
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

loadConfig();
