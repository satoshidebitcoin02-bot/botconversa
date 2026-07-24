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
let flowDrafts = {}; // { [personaId]: { enabled: bool, nodes: [{message, buttons:[{label, next}]}] } }

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
    const flowEnabled = !!(o.flow && Array.isArray(o.flow.nodes) && o.flow.nodes.length > 0);
    return `
      <div class="admin-persona-card" data-id="${p.id}">
        <img src="${avatar}" alt="${name}" class="persona-avatar-preview" />
        <div class="admin-persona-fields">
          <div>
            <label>Nome</label>
            <input type="text" class="p-name" value="${name.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label>Foto</label>
            <input type="hidden" class="p-avatar" value="${avatar.replace(/"/g, "&quot;")}" />
            <label class="admin-upload-btn">
              📁 Enviar arquivo
              <input type="file" accept="image/*" class="p-avatar-file" hidden />
            </label>
          </div>
          <div>
            <label>Primeira mensagem (usada só se o fluxo abaixo estiver desativado)</label>
            <textarea class="p-opener" rows="2">${opener}</textarea>
          </div>
          <div class="persona-flow">
            <label class="admin-row" style="margin-bottom:6px;">
              <input type="checkbox" class="p-flow-enabled" ${flowEnabled ? "checked" : ""} data-persona="${p.id}" />
              Usar fluxo de botões estilo ManyChat
            </label>
            <div class="flow-editor" data-persona="${p.id}" ${flowEnabled ? "" : "hidden"}>
              <div class="flow-nodes" data-persona="${p.id}"></div>
              <button type="button" class="admin-upload-btn add-node-btn" data-persona="${p.id}">+ Adicionar passo</button>
            </div>
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

  // inicializa os rascunhos de fluxo e renderiza os editores
  PERSONAS.forEach(p => {
    const o = overrides[p.id] || {};
    const existingFlow = o.flow && Array.isArray(o.flow.nodes) ? o.flow : { nodes: [] };
    flowDrafts[p.id] = JSON.parse(JSON.stringify(existingFlow));
    if (flowDrafts[p.id].nodes.length === 0) {
      flowDrafts[p.id].nodes.push({ message: "", buttons: [] });
    }
    renderFlowEditor(p.id);
  });
}

// ---- editor de fluxo (estilo ManyChat) ----

function nodePreview(node, idx) {
  const text = (node.message || "").trim();
  const label = text ? text.slice(0, 26) + (text.length > 26 ? "…" : "") : "(sem mensagem)";
  return `${idx === 0 ? "Início" : "Passo " + (idx + 1)}: ${label}`;
}

function renderFlowEditor(personaId) {
  const container = document.querySelector(`.flow-nodes[data-persona="${personaId}"]`);
  const draft = flowDrafts[personaId];
  if (!container || !draft) return;

  container.innerHTML = draft.nodes.map((node, idx) => `
    <div class="flow-node">
      <div class="flow-node-header">
        <span class="flow-node-badge">${idx === 0 ? "Início" : "Passo " + (idx + 1)}</span>
        ${draft.nodes.length > 1 ? `<button type="button" class="admin-secondary-btn remove-node-btn" data-persona="${personaId}" data-idx="${idx}">Remover passo</button>` : ""}
      </div>
      <textarea class="node-message" rows="2" data-persona="${personaId}" data-idx="${idx}" placeholder="Mensagem que ela envia nesse passo">${node.message || ""}</textarea>
      <div class="node-buttons">
        ${node.buttons.map((btn, bIdx) => `
          <div class="flow-button-row">
            <input type="text" class="btn-label" data-persona="${personaId}" data-idx="${idx}" data-bidx="${bIdx}" value="${(btn.label || "").replace(/"/g, "&quot;")}" placeholder="Texto do botão" />
            <select class="btn-next" data-persona="${personaId}" data-idx="${idx}" data-bidx="${bIdx}">
              <option value="-1" ${btn.next == null || btn.next === -1 ? "selected" : ""}>Encerrar (devolve pro roteiro simulado)</option>
              ${draft.nodes.map((n2, i2) => `<option value="${i2}" ${btn.next === i2 ? "selected" : ""}>${nodePreview(n2, i2)}</option>`).join("")}
            </select>
            <button type="button" class="admin-secondary-btn remove-button-btn" data-persona="${personaId}" data-idx="${idx}" data-bidx="${bIdx}">✕</button>
          </div>
        `).join("")}
      </div>
      <button type="button" class="admin-upload-btn add-button-btn" data-persona="${personaId}" data-idx="${idx}">+ Botão</button>
    </div>
  `).join("");
}

personaList.addEventListener("change", e => {
  if (e.target.classList.contains("p-flow-enabled")) {
    const personaId = e.target.dataset.persona;
    const editor = document.querySelector(`.flow-editor[data-persona="${personaId}"]`);
    editor.hidden = !e.target.checked;
  }
  if (e.target.classList.contains("btn-next")) {
    const { persona: personaId, idx, bidx } = e.target.dataset;
    flowDrafts[personaId].nodes[idx].buttons[bidx].next = Number(e.target.value);
  }
});

personaList.addEventListener("input", e => {
  if (e.target.classList.contains("node-message")) {
    const { persona: personaId, idx } = e.target.dataset;
    flowDrafts[personaId].nodes[idx].message = e.target.value;
  }
  if (e.target.classList.contains("btn-label")) {
    const { persona: personaId, idx, bidx } = e.target.dataset;
    flowDrafts[personaId].nodes[idx].buttons[bidx].label = e.target.value;
  }
});

personaList.addEventListener("click", e => {
  const addNodeBtn = e.target.closest(".add-node-btn");
  if (addNodeBtn) {
    const personaId = addNodeBtn.dataset.persona;
    flowDrafts[personaId].nodes.push({ message: "", buttons: [] });
    renderFlowEditor(personaId);
    return;
  }

  const removeNodeBtn = e.target.closest(".remove-node-btn");
  if (removeNodeBtn) {
    const personaId = removeNodeBtn.dataset.persona;
    const removedIdx = Number(removeNodeBtn.dataset.idx);
    const draft = flowDrafts[personaId];
    draft.nodes.splice(removedIdx, 1);
    // remapeia os índices dos botões que apontavam pra nós deslocados
    draft.nodes.forEach(node => {
      node.buttons.forEach(btn => {
        if (btn.next === removedIdx) btn.next = -1;
        else if (btn.next > removedIdx) btn.next -= 1;
      });
    });
    renderFlowEditor(personaId);
    return;
  }

  const addButtonBtn = e.target.closest(".add-button-btn");
  if (addButtonBtn) {
    const personaId = addButtonBtn.dataset.persona;
    const idx = Number(addButtonBtn.dataset.idx);
    flowDrafts[personaId].nodes[idx].buttons.push({ label: "", next: -1 });
    renderFlowEditor(personaId);
    return;
  }

  const removeButtonBtn = e.target.closest(".remove-button-btn");
  if (removeButtonBtn) {
    const personaId = removeButtonBtn.dataset.persona;
    const idx = Number(removeButtonBtn.dataset.idx);
    const bidx = Number(removeButtonBtn.dataset.bidx);
    flowDrafts[personaId].nodes[idx].buttons.splice(bidx, 1);
    renderFlowEditor(personaId);
  }
});

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
    const flowEnabled = card.querySelector(".p-flow-enabled").checked;
    const draft = flowDrafts[id];
    const cleanNodes = (draft.nodes || [])
      .filter(n => (n.message || "").trim() || n.buttons.length)
      .map(n => ({
        message: (n.message || "").trim(),
        buttons: (n.buttons || []).filter(b => (b.label || "").trim()),
      }));

    config.personas[id] = {
      name: card.querySelector(".p-name").value.trim(),
      avatar: card.querySelector(".p-avatar").value.trim(),
      opener: card.querySelector(".p-opener").value.trim(),
      flow: flowEnabled && cleanNodes.length ? { nodes: cleanNodes } : null,
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
