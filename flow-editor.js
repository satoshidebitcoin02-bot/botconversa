// Editor visual de fluxos (canvas com nós conectados por linha, estilo
// ManyChat), usando a biblioteca Drawflow. Cada fluxo é salvo em
// config.flows[id] = { id, name, personaIds: [...], graph: <export do Drawflow> }.

let flowsDraft = {}; // { [flowId]: { id, name, personaIds, graph } }
let dfEditor = null;
let currentFlowId = null;
let flowDirty = false;

function markFlowDirty() {
  flowDirty = true;
}

// retorna true se pode prosseguir (sem alterações, ou usuário confirmou perder elas)
function confirmDiscardFlowChanges() {
  if (!flowDirty) return true;
  return confirm("Você tem alterações não salvas nesse fluxo. Sair mesmo assim e perder elas?");
}

window.addEventListener("beforeunload", e => {
  if (!flowDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

const NODE_META = {
  delay: { icon: "clock", label: "Delay", inputs: 1, outputs: 1 },
  randomizer: { icon: "shuffle", label: "Randomizer", inputs: 1, outputs: 4 },
  wait: { icon: "user-clock", label: "Aguardar Resposta", inputs: 1, outputs: 1 },
  audio: { icon: "mic", label: "Áudio", inputs: 1, outputs: 1 },
  contact: { icon: "user", label: "Contato", inputs: 1, outputs: 1 },
  document: { icon: "file-text", label: "Documento", inputs: 1, outputs: 1 },
  media: { icon: "image", label: "Mídia", inputs: 1, outputs: 1 },
  text: { icon: "message", label: "Texto", inputs: 1, outputs: 4 },
};

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

function deleteButtonHtml() {
  return `<button type="button" class="df-delete-node" title="Remover nó">${icon("trash", 12)}</button>`;
}

function nodeHtml(type, data) {
  const meta = NODE_META[type];
  const title = `<div class="df-node-title"><span>${meta.label}</span>${deleteButtonHtml()}</div>`;

  if (type === "text") {
    const buttons = data.buttons || [{ label: "" }, { label: "" }, { label: "" }, { label: "" }];
    const buttonRows = buttons.map((b, i) => `
      <div class="df-row">
        <span class="df-branch-letter">${String.fromCharCode(65 + i)}</span>
        <input type="text" class="df-field" data-field="buttons.${i}.label" placeholder="Botão (opcional)" value="${escapeAttr(b.label)}" />
      </div>
    `).join("");
    return `<div class="df-node">${title}
      <textarea class="df-field" data-field="message" rows="3" placeholder="Mensagem que ela envia...">${data.message || ""}</textarea>
      <div class="df-hint">Botões (opcional — deixe em branco pra não usar; se usar, o fluxo espera o clique):</div>
      ${buttonRows}
    </div>`;
  }
  if (type === "delay") {
    return `<div class="df-node">${title}<div class="df-row"><input type="number" class="df-field" data-field="seconds" min="1" max="120" value="${data.seconds || 5}" /> <span>segundos</span></div></div>`;
  }
  if (type === "randomizer") {
    const branches = data.branches || [{ weight: 25 }, { weight: 25 }, { weight: 25 }, { weight: 25 }];
    const rows = branches.map((b, i) => `
      <div class="df-row">
        <span class="df-branch-letter">${String.fromCharCode(65 + i)}</span>
        <input type="number" class="df-field" data-field="branches.${i}.weight" min="0" max="100" value="${b.weight}" /> <span>%</span>
      </div>
    `).join("");
    return `<div class="df-node">${title}${rows}</div>`;
  }
  if (type === "wait") {
    return `<div class="df-node">${title}<div class="df-hint">Espera o usuário enviar qualquer resposta antes de continuar.</div></div>`;
  }
  if (type === "audio" || type === "media") {
    const accept = type === "audio" ? "audio/*" : "image/*";
    return `<div class="df-node">${title}
      <label class="df-upload-btn">${icon("folder", 12)} Enviar arquivo<input type="file" accept="${accept}" class="df-file" data-field="url" hidden /></label>
      <div class="df-file-name">${data.url ? icon("check", 11) + " arquivo carregado" : "nenhum arquivo"}</div>
    </div>`;
  }
  if (type === "document") {
    return `<div class="df-node">${title}
      <label class="df-upload-btn">${icon("folder", 12)} Enviar arquivo<input type="file" class="df-file" data-field="url" data-filename-field="filename" hidden /></label>
      <div class="df-file-name">${data.filename ? icon("file-text", 11) + " " + data.filename : "nenhum arquivo"}</div>
    </div>`;
  }
  if (type === "contact") {
    return `<div class="df-node">${title}
      <input type="text" class="df-field" data-field="name" placeholder="Nome do contato" value="${escapeAttr(data.name)}" />
      <input type="text" class="df-field" data-field="phone" placeholder="Telefone" value="${escapeAttr(data.phone)}" />
    </div>`;
  }
  return `<div class="df-node">${title}</div>`;
}

function initDrawflow() {
  if (dfEditor) return;
  const container = document.getElementById("drawflowCanvas");
  dfEditor = new Drawflow(container);
  dfEditor.reroute = true;
  dfEditor.start();

  dfEditor.on("connectionCreated", markFlowDirty);
  dfEditor.on("connectionRemoved", markFlowDirty);
  dfEditor.on("nodeMoved", markFlowDirty);
  dfEditor.on("nodeRemoved", markFlowDirty);
}

function addNodeToCanvas(type, clientX, clientY) {
  const meta = NODE_META[type];
  const precanvas = dfEditor.precanvas;
  const rect = precanvas.getBoundingClientRect();
  const posX = (clientX - rect.x) / dfEditor.zoom;
  const posY = (clientY - rect.y) / dfEditor.zoom;

  let initialData = {};
  if (type === "randomizer") {
    initialData = { branches: [{ weight: 25 }, { weight: 25 }, { weight: 25 }, { weight: 25 }] };
  } else if (type === "text") {
    initialData = { buttons: [{ label: "" }, { label: "" }, { label: "" }, { label: "" }] };
  }

  dfEditor.addNode(
    type,
    meta.inputs,
    meta.outputs,
    posX,
    posY,
    type,
    initialData,
    nodeHtml(type, initialData)
  );
  markFlowDirty();
}

function setNestedField(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = isNaN(parts[i]) ? parts[i] : Number(parts[i]);
    if (cur[key] == null) cur[key] = isNaN(parts[i + 1]) ? {} : [];
    cur = cur[key];
  }
  const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : Number(parts[parts.length - 1]);
  cur[lastKey] = value;
}

// ---- sugestões de mensagem (reaproveitar frases já usadas no fluxo) ----
function getMessageSuggestions(excludeText) {
  if (!dfEditor) return [];
  const data = dfEditor.export().drawflow.Home.data;
  const set = new Set();
  Object.values(data).forEach(n => {
    if (n.name === "text" && n.data && n.data.message) {
      const msg = n.data.message.trim();
      if (msg && msg !== excludeText) set.add(msg);
    }
  });
  return Array.from(set);
}

function ensureSuggestBox() {
  let box = document.getElementById("dfSuggestBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "dfSuggestBox";
    box.className = "df-suggest-box";
    box.hidden = true;
    document.getElementById("drawflowCanvas").appendChild(box);
  }
  return box;
}

function showSuggestions(textarea) {
  const typed = textarea.value.trim();
  const suggestions = getMessageSuggestions(typed)
    .filter(s => !typed || s.toLowerCase().includes(typed.toLowerCase()));
  const box = ensureSuggestBox();
  if (suggestions.length === 0) {
    box.hidden = true;
    return;
  }
  box.innerHTML = suggestions.slice(0, 6).map(s => `<div class="df-suggest-item">${s.replace(/</g, "&lt;")}</div>`).join("");

  const canvasRect = document.getElementById("drawflowCanvas").getBoundingClientRect();
  const taRect = textarea.getBoundingClientRect();
  box.style.left = (taRect.left - canvasRect.left) + "px";
  box.style.top = (taRect.bottom - canvasRect.top + 4) + "px";
  box.style.width = taRect.width + "px";
  box.hidden = false;

  box.querySelectorAll(".df-suggest-item").forEach((item, i) => {
    item.addEventListener("mousedown", ev => {
      ev.preventDefault();
      textarea.value = suggestions[i];
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      box.hidden = true;
    });
  });
}

function hideSuggestions() {
  const box = document.getElementById("dfSuggestBox");
  if (box) box.hidden = true;
}

function bindCanvasDelegation() {
  const container = document.getElementById("drawflowCanvas");

  container.addEventListener("focusin", e => {
    if (e.target.matches('textarea.df-field[data-field="message"]')) showSuggestions(e.target);
  });

  container.addEventListener("focusout", e => {
    if (e.target.matches('textarea.df-field[data-field="message"]')) setTimeout(hideSuggestions, 150);
  });

  container.addEventListener("click", e => {
    const delBtn = e.target.closest(".df-delete-node");
    if (!delBtn) return;
    const nodeEl = delBtn.closest(".drawflow-node");
    if (!nodeEl) return;
    const nodeId = nodeEl.id.replace("node-", "");
    dfEditor.removeNodeId("node-" + nodeId);
    markFlowDirty();
  });

  container.addEventListener("input", e => {
    const field = e.target.closest(".df-field");
    if (!field || field.type === "file") return;
    const nodeEl = e.target.closest(".drawflow-node");
    if (!nodeEl) return;
    const nodeId = nodeEl.id.replace("node-", "");
    const nodeData = dfEditor.getNodeFromId(nodeId).data;
    const value = field.type === "number" ? Number(field.value) : field.value;
    setNestedField(nodeData, field.dataset.field, value);
    dfEditor.updateNodeDataFromId(nodeId, nodeData);
    markFlowDirty();
    if (field.matches('textarea.df-field[data-field="message"]')) showSuggestions(field);
  });

  container.addEventListener("change", async e => {
    if (!e.target.classList.contains("df-file")) return;
    const file = e.target.files[0];
    if (!file) return;
    const nodeEl = e.target.closest(".drawflow-node");
    const nodeId = nodeEl.id.replace("node-", "");
    const nodeData = dfEditor.getNodeFromId(nodeId).data;
    const dataUrl = await readFileAsDataUrl(file);
    nodeData.url = dataUrl;
    if (e.target.dataset.filenameField) nodeData.filename = file.name;
    dfEditor.updateNodeDataFromId(nodeId, nodeData);
    markFlowDirty();
    const label = nodeEl.querySelector(".df-file-name");
    if (label) label.innerHTML = e.target.dataset.filenameField ? icon("file-text", 11) + " " + file.name : icon("check", 11) + " arquivo carregado";
  });
}

function bindPaletteDragDrop() {
  document.querySelectorAll(".palette-item").forEach(item => {
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("node-type", item.dataset.node);
    });
  });

  const container = document.getElementById("drawflowCanvas");
  container.addEventListener("dragover", e => e.preventDefault());
  container.addEventListener("drop", e => {
    e.preventDefault();
    const type = e.dataTransfer.getData("node-type");
    if (type) addNodeToCanvas(type, e.clientX, e.clientY);
  });
}

function renderFlowsList() {
  const list = document.getElementById("flowsSubmenuList");
  const flows = Object.values(flowsDraft);
  list.innerHTML = flows.map(f => `
    <button type="button" class="flows-submenu-item ${f.id === currentFlowId ? "active" : ""}" data-flow-id="${f.id}">
      ${icon("shuffle", 12)} ${f.name || "(sem nome)"}
    </button>
  `).join("");

  list.querySelectorAll(".flows-submenu-item").forEach(el => {
    el.addEventListener("click", () => openFlow(el.dataset.flowId));
  });
}

function renderPersonaAssign(selectedIds) {
  const wrap = document.getElementById("flowPersonaAssign");
  wrap.innerHTML = PERSONAS_FOR_ADMIN.map(p => `
    <label class="flow-persona-check">
      <input type="checkbox" value="${p.id}" ${selectedIds.includes(p.id) ? "checked" : ""} />
      ${p.name}
    </label>
  `).join("");
  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", markFlowDirty);
  });
}

function getSelectedPersonaIds() {
  return Array.from(document.querySelectorAll("#flowPersonaAssign input:checked")).map(i => i.value);
}

function openFlow(flowId) {
  if (currentFlowId && currentFlowId !== flowId && !confirmDiscardFlowChanges()) return;

  currentFlowId = flowId;
  flowDirty = false;
  const flow = flowsDraft[flowId];

  activateTab("flows");
  document.getElementById("flowEditorWrap").hidden = false;
  document.getElementById("flowNameInput").value = flow.name || "";
  document.getElementById("flowSaveStatus").textContent = "";
  renderPersonaAssign(flow.personaIds || []);
  renderFlowsList();

  initDrawflow();
  dfEditor.clear();
  if (flow.graph && flow.graph.drawflow) {
    dfEditor.import(flow.graph);
  }
}

function createNewFlow() {
  if (currentFlowId && !confirmDiscardFlowChanges()) return;
  const id = "flow_" + Date.now();
  flowsDraft[id] = { id, name: "Novo fluxo", personaIds: [], graph: null };
  currentFlowId = null; // evita o confirm duplicado dentro de openFlow
  openFlow(id);
}

function saveCurrentFlow() {
  if (!currentFlowId) return;
  const flow = flowsDraft[currentFlowId];
  flow.name = document.getElementById("flowNameInput").value.trim() || "Fluxo sem nome";
  flow.personaIds = getSelectedPersonaIds();
  flow.graph = dfEditor.export();
  flowDirty = false;
  renderFlowsList();
  const status = document.getElementById("flowSaveStatus");
  status.textContent = "Fluxo salvo neste rascunho — clique em Salvar alterações pra publicar.";
  status.className = "admin-status success";
}

function deleteCurrentFlow() {
  if (!currentFlowId) return;
  if (!confirm("Excluir este fluxo?")) return;
  delete flowsDraft[currentFlowId];
  currentFlowId = null;
  flowDirty = false;
  document.getElementById("flowEditorWrap").hidden = true;
  renderFlowsList();
}

function initFlowsTab() {
  bindPaletteDragDrop();
  bindCanvasDelegation();
  document.getElementById("newFlowBtnSidebar").addEventListener("click", createNewFlow);
  document.getElementById("newFlowBtnEditor").addEventListener("click", createNewFlow);
  document.getElementById("saveFlowBtn").addEventListener("click", saveCurrentFlow);
  document.getElementById("deleteFlowBtn").addEventListener("click", deleteCurrentFlow);
  document.getElementById("flowNameInput").addEventListener("input", markFlowDirty);
  renderFlowsList();
}
