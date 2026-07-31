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

function messagePreview(message) {
  const msg = (message || "").trim();
  if (!msg) return "(sem mensagem — clique em editar)";
  return msg.length > 70 ? msg.slice(0, 70) + "…" : msg;
}

function buttonBadgesHtml(buttons) {
  const filled = (buttons || []).filter(b => (b.label || "").trim());
  if (!filled.length) return "";
  return `<div class="df-node-badges">${filled.map(b => `<span class="df-badge">${escapeAttr(b.label).replace(/&quot;/g, '"')}${b.url ? ' 🔗' : ''}</span>`).join("")}</div>`;
}

function nodeHtml(type, data) {
  const meta = NODE_META[type];
  const title = `<div class="df-node-title"><span>${meta.label}</span>${deleteButtonHtml()}</div>`;

  if (type === "text") {
    return `<div class="df-node df-node-compact">${title}
      <div class="df-node-preview">${messagePreview(data.message).replace(/</g, "&lt;")}</div>
      ${buttonBadgesHtml(data.buttons)}
      <button type="button" class="df-edit-btn">Editar</button>
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
  if (type === "audio") {
    return `<div class="df-node">${title}
      <label class="df-upload-btn">${icon("folder", 12)}<span>Enviar arquivo</span><input type="file" accept="audio/*" class="df-file" data-field="url" hidden /></label>
      <div class="df-file-name">${data.url ? icon("check", 11) + " arquivo carregado" : "nenhum arquivo"}</div>
    </div>`;
  }
  if (type === "media") {
    const urls = data.urls || [];
    const thumbs = urls.map((u, i) => `
      <div class="df-thumb-wrap">
        <img class="df-thumb" src="${u}" alt="" />
        <button type="button" class="df-thumb-remove" data-idx="${i}" title="Remover">×</button>
        ${i > 0 ? `<button type="button" class="df-thumb-move df-thumb-move-left" data-idx="${i}" title="Mover para esquerda">‹</button>` : ""}
        ${i < urls.length - 1 ? `<button type="button" class="df-thumb-move df-thumb-move-right" data-idx="${i}" title="Mover para direita">›</button>` : ""}
      </div>
    `).join("");
    return `<div class="df-node">${title}
      <label class="df-upload-btn">${icon("folder", 12)}<span>Adicionar imagem</span><input type="file" accept="image/*" class="df-file-multi" hidden /></label>
      <div class="df-hint">${urls.length > 1 ? "Vira um carrossel no chat" : "Adicione mais de uma pra virar carrossel"}</div>
      <div class="df-media-thumbs">${thumbs}</div>
    </div>`;
  }
  if (type === "document") {
    return `<div class="df-node">${title}
      <label class="df-upload-btn">${icon("folder", 12)}<span>Enviar arquivo</span><input type="file" class="df-file" data-field="url" data-filename-field="filename" hidden /></label>
      <div class="df-file-name">${data.filename ? icon("file-text", 11) + "<span>" + data.filename + "</span>" : "nenhum arquivo"}</div>
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

// ---- botão de desconectar no meio da linha ----
function clearDisconnectButtons() {
  document.querySelectorAll(".df-disconnect-btn").forEach(b => b.remove());
}

function renderDisconnectButtons() {
  if (!dfEditor) return;
  clearDisconnectButtons();
  const precanvas = dfEditor.precanvas;

  precanvas.querySelectorAll(".connection").forEach(connEl => {
    const path = connEl.querySelector(".main-path");
    if (!path) return;
    const len = path.getTotalLength();
    if (!len) return;

    const classes = Array.from(connEl.classList);
    const inNode = (classes.find(c => c.startsWith("node_in_node-")) || "").replace("node_in_node-", "");
    const outNode = (classes.find(c => c.startsWith("node_out_node-")) || "").replace("node_out_node-", "");
    const outputClass = classes.find(c => c.startsWith("output_"));
    const inputClass = classes.find(c => c.startsWith("input_"));
    if (!inNode || !outNode || !outputClass || !inputClass) return;

    const mid = path.getPointAtLength(len / 2);
    const btn = document.createElement("div");
    btn.className = "df-disconnect-btn";
    btn.title = "Desconectar";
    btn.style.left = (mid.x - 9) + "px";
    btn.style.top = (mid.y - 9) + "px";
    btn.textContent = "×";
    btn.addEventListener("mousedown", e => e.stopPropagation());
    btn.addEventListener("click", e => {
      e.stopPropagation();
      dfEditor.removeSingleConnection(outNode, inNode, outputClass, inputClass);
      markFlowDirty();
      renderDisconnectButtons();
    });
    precanvas.appendChild(btn);
  });
}

function initDrawflow() {
  if (dfEditor) return;
  const container = document.getElementById("drawflowCanvas");
  dfEditor = new Drawflow(container);
  dfEditor.reroute = false;
  dfEditor.start();

  dfEditor.on("connectionCreated", () => { markFlowDirty(); renderDisconnectButtons(); });
  dfEditor.on("connectionRemoved", () => { markFlowDirty(); renderDisconnectButtons(); });
  dfEditor.on("nodeMoved", () => { markFlowDirty(); renderDisconnectButtons(); });
  dfEditor.on("nodeRemoved", () => { markFlowDirty(); renderDisconnectButtons(); });
  dfEditor.on("zoom", renderDisconnectButtons);
  dfEditor.on("translate", renderDisconnectButtons);

  // Remove os botões × durante drag de fio para não bloquear os pontos de entrada
  container.addEventListener("mousedown", e => {
    if (e.target.classList.contains("output") || e.target.classList.contains("input")) {
      clearDisconnectButtons();
    }
  }, true);
  document.addEventListener("mouseup", () => {
    setTimeout(renderDisconnectButtons, 80);
  });

  // Drawflow só ativa o pan quando ev.target tem classe "drawflow" (o precanvas).
  // Quando o canvas foi transladado, cliques nas áreas vazias atingem o container
  // externo em vez do precanvas — esse listener corrige isso.
  container.addEventListener("mousedown", e => {
    if (e.target === container) {
      dfEditor.editor_selected = true;
    }
  }, true); // capture: roda antes do listener interno do Drawflow

  let rafPending = false;
  container.addEventListener("mousemove", () => {
    if (!dfEditor.drag || rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { renderDisconnectButtons(); rafPending = false; });
  });
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
    initialData = { message: "", typingSeconds: 1, buttons: [{ label: "" }, { label: "" }, { label: "" }, { label: "" }] };
  } else if (type === "media") {
    initialData = { urls: [] };
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
    document.getElementById("dfModalMessage").insertAdjacentElement("afterend", box);
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
  box.hidden = false;

  box.querySelectorAll(".df-suggest-item").forEach((item, i) => {
    item.addEventListener("mousedown", ev => {
      ev.preventDefault();
      textarea.value = suggestions[i];
      box.hidden = true;
    });
  });
}

function hideSuggestions() {
  const box = document.getElementById("dfSuggestBox");
  if (box) box.hidden = true;
}

// ---- modal de edição do nó Texto ----
let editingNodeId = null;

const MAX_BUTTONS = 4;

function renderModalButtons(buttons) {
  const container = document.getElementById("dfModalButtons");
  container.innerHTML = buttons.map((b, i) => `
    <div class="df-row df-btn-row">
      <span class="df-branch-letter">${String.fromCharCode(65 + i)}</span>
      <div class="df-btn-fields">
        <input type="text" class="df-modal-btn-field" data-idx="${i}" placeholder="Texto do botão" value="${escapeAttr(b.label)}" />
        <input type="url" class="df-modal-btn-url" data-idx="${i}" placeholder="Link (opcional, ex: https://...)" value="${escapeAttr(b.url || '')}" />
      </div>
      ${i > 0 ? `<button type="button" class="df-remove-btn-btn" data-idx="${i}" title="Remover">×</button>` : ""}
    </div>
  `).join("");

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-button-btn admin-secondary-btn";
  addBtn.textContent = "+ Adicionar botão";
  addBtn.hidden = buttons.length >= MAX_BUTTONS;
  addBtn.addEventListener("click", () => {
    const current = collectModalButtons();
    if (current.length >= MAX_BUTTONS) return;
    current.push({ label: "", url: "" });
    renderModalButtons(current);
  });
  container.appendChild(addBtn);

  container.querySelectorAll(".df-remove-btn-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const current = collectModalButtons();
      current.splice(Number(btn.dataset.idx), 1);
      renderModalButtons(current);
    });
  });
}

function collectModalButtons() {
  const labelInputs = Array.from(document.querySelectorAll("#dfModalButtons .df-modal-btn-field"));
  const urlInputs   = Array.from(document.querySelectorAll("#dfModalButtons .df-modal-btn-url"));
  return labelInputs.map((inp, i) => ({
    label: inp.value,
    url:   urlInputs[i] ? urlInputs[i].value.trim() : "",
  }));
}

function openTextNodeModal(nodeId) {
  editingNodeId = nodeId;
  const nodeData = dfEditor.getNodeFromId(nodeId).data;
  const buttons = (nodeData.buttons || []).filter(b => b.label || b.url);

  document.getElementById("dfModalMessage").value = nodeData.message || "";
  document.getElementById("dfModalTypingSeconds").value = nodeData.typingSeconds ?? 1;
  renderModalButtons(buttons);

  document.getElementById("dfNodeModalOverlay").hidden = false;
  document.getElementById("dfModalMessage").focus();
}

function closeNodeModal() {
  document.getElementById("dfNodeModalOverlay").hidden = true;
  hideSuggestions();
  editingNodeId = null;
}

function updateTextNodeCard(nodeId, data) {
  const nodeEl = document.getElementById("node-" + nodeId);
  if (!nodeEl) return;
  const previewEl = nodeEl.querySelector(".df-node-preview");
  if (previewEl) previewEl.textContent = messagePreview(data.message);

  let badgesEl = nodeEl.querySelector(".df-node-badges");
  const badgesHtml = buttonBadgesHtml(data.buttons);
  if (badgesEl) {
    badgesEl.outerHTML = badgesHtml || "";
  } else if (badgesHtml) {
    previewEl.insertAdjacentHTML("afterend", badgesHtml);
  }
}

function syncNodeHtml(nodeId) {
  const nodeEl = document.getElementById("node-" + nodeId);
  if (!nodeEl) return;
  const moduleData = dfEditor.drawflow.drawflow;
  for (const module of Object.keys(moduleData)) {
    const internal = moduleData[module].data[nodeId] || moduleData[module].data[Number(nodeId)];
    if (internal) { internal.html = nodeEl.innerHTML; break; }
  }
}

function saveNodeModal() {
  if (!editingNodeId) return;
  const nodeData = dfEditor.getNodeFromId(editingNodeId).data;
  nodeData.message = document.getElementById("dfModalMessage").value;
  nodeData.typingSeconds = Number(document.getElementById("dfModalTypingSeconds").value) || 0;
  nodeData.buttons = collectModalButtons();
  dfEditor.updateNodeDataFromId(editingNodeId, nodeData);
  markFlowDirty();
  updateTextNodeCard(editingNodeId, nodeData);
  syncNodeHtml(editingNodeId); // garante que o export captura o HTML atualizado
  dfEditor.updateConnectionNodes("node-" + editingNodeId);
  closeNodeModal();
}

function bindModal() {
  document.getElementById("dfModalCloseBtn").addEventListener("click", closeNodeModal);
  document.getElementById("dfModalSaveBtn").addEventListener("click", saveNodeModal);
  document.getElementById("dfNodeModalOverlay").addEventListener("mousedown", e => {
    if (e.target.id === "dfNodeModalOverlay") closeNodeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("dfNodeModalOverlay").hidden) closeNodeModal();
  });
  const msgField = document.getElementById("dfModalMessage");
  msgField.addEventListener("focus", () => showSuggestions(msgField));
  msgField.addEventListener("input", () => showSuggestions(msgField));
  msgField.addEventListener("blur", () => setTimeout(hideSuggestions, 150));
}

function bindCanvasDelegation() {
  const container = document.getElementById("drawflowCanvas");

  container.addEventListener("click", e => {
    const editBtn = e.target.closest(".df-edit-btn");
    if (editBtn) {
      const nodeEl = editBtn.closest(".drawflow-node");
      openTextNodeModal(nodeEl.id.replace("node-", ""));
      return;
    }

    const thumbRemove = e.target.closest(".df-thumb-remove");
    if (thumbRemove) {
      const nodeEl = thumbRemove.closest(".drawflow-node");
      const nodeId = nodeEl.id.replace("node-", "");
      const nodeData = dfEditor.getNodeFromId(nodeId).data;
      nodeData.urls.splice(Number(thumbRemove.dataset.idx), 1);
      dfEditor.updateNodeDataFromId(nodeId, nodeData);
      nodeEl.querySelector(".df-node").outerHTML = nodeHtml("media", nodeData);
      markFlowDirty();
      return;
    }

    const thumbMove = e.target.closest(".df-thumb-move");
    if (thumbMove) {
      const nodeEl = thumbMove.closest(".drawflow-node");
      const nodeId = nodeEl.id.replace("node-", "");
      const nodeData = dfEditor.getNodeFromId(nodeId).data;
      const idx = Number(thumbMove.dataset.idx);
      const delta = thumbMove.classList.contains("df-thumb-move-left") ? -1 : 1;
      const swap = idx + delta;
      if (swap >= 0 && swap < nodeData.urls.length) {
        [nodeData.urls[idx], nodeData.urls[swap]] = [nodeData.urls[swap], nodeData.urls[idx]];
        dfEditor.updateNodeDataFromId(nodeId, nodeData);
        nodeEl.querySelector(".df-node").outerHTML = nodeHtml("media", nodeData);
        markFlowDirty();
      }
      return;
    }

    const delBtn = e.target.closest(".df-delete-node");
    if (delBtn) {
      const nodeEl = delBtn.closest(".drawflow-node");
      if (!nodeEl) return;
      const nodeId = nodeEl.id.replace("node-", "");
      dfEditor.removeNodeId("node-" + nodeId);
      markFlowDirty();
    }
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
    field.setAttribute("value", String(field.value)); // persiste o atributo para o export do Drawflow
    dfEditor.updateNodeDataFromId(nodeId, nodeData);
    markFlowDirty();
  });

  container.addEventListener("change", async e => {
    const nodeEl = e.target.closest(".drawflow-node");
    if (!nodeEl) return;
    const nodeId = nodeEl.id.replace("node-", "");

    if (e.target.classList.contains("df-file-multi")) {
      const file = e.target.files[0];
      if (!file) return;
      const nodeData = dfEditor.getNodeFromId(nodeId).data;
      const dataUrl = await readFileAsDataUrl(file);
      nodeData.urls = [...(nodeData.urls || []), dataUrl];
      dfEditor.updateNodeDataFromId(nodeId, nodeData);
      nodeEl.querySelector(".df-node").outerHTML = nodeHtml("media", nodeData);
      markFlowDirty();
      return;
    }

    if (!e.target.classList.contains("df-file")) return;
    const file = e.target.files[0];
    if (!file) return;
    const nodeData = dfEditor.getNodeFromId(nodeId).data;
    const dataUrl = await readFileAsDataUrl(file);
    nodeData.url = dataUrl;
    if (e.target.dataset.filenameField) nodeData.filename = file.name;
    dfEditor.updateNodeDataFromId(nodeId, nodeData);
    markFlowDirty();
    const label = nodeEl.querySelector(".df-file-name");
    if (label) label.innerHTML = e.target.dataset.filenameField ? icon("file-text", 11) + "<span>" + file.name + "</span>" : icon("check", 11) + " arquivo carregado";
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

function restoreNodeFieldValues() {
  const exported = dfEditor.export().drawflow.Home.data;
  Object.entries(exported).forEach(([id, node]) => {
    const nodeEl = document.getElementById("node-" + id);
    if (!nodeEl || !node.data) return;
    nodeEl.querySelectorAll(".df-field[data-field]").forEach(field => {
      const parts = field.dataset.field.split(".");
      let val = node.data;
      for (const part of parts) val = val != null ? val[isNaN(part) ? part : Number(part)] : undefined;
      if (val != null) {
        field.value = val;
        field.setAttribute("value", String(val));
      }
    });
  });
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
  clearDisconnectButtons();
  if (flow.graph && flow.graph.drawflow) {
    dfEditor.import(flow.graph);
    restoreNodeFieldValues();
  }
  renderDisconnectButtons();
}

function createNewFlow() {
  if (currentFlowId && !confirmDiscardFlowChanges()) return;
  const id = "flow_" + Date.now();
  flowsDraft[id] = { id, name: "Novo fluxo", personaIds: [], graph: null };
  currentFlowId = null; // evita o confirm duplicado dentro de openFlow
  openFlow(id);
}

async function saveCurrentFlow() {
  if (!currentFlowId) return;
  const flow = flowsDraft[currentFlowId];
  flow.name = document.getElementById("flowNameInput").value.trim() || "Fluxo sem nome";
  flow.personaIds = getSelectedPersonaIds();
  flow.graph = dfEditor.export();
  renderFlowsList();

  const status = document.getElementById("flowSaveStatus");
  status.textContent = "Publicando...";
  status.className = "admin-status";

  await saveAll();
  flowDirty = false;

  const globalStatusOk = document.getElementById("saveStatus").className.includes("success");
  status.textContent = globalStatusOk ? "Publicado com sucesso!" : "Erro ao publicar. Tente novamente.";
  status.className = globalStatusOk ? "admin-status success" : "admin-status error";
}

async function deleteCurrentFlow() {
  if (!currentFlowId) return;
  if (!confirm("Excluir este fluxo? Isso já publica a remoção.")) return;
  delete flowsDraft[currentFlowId];
  currentFlowId = null;
  flowDirty = false;
  document.getElementById("flowEditorWrap").hidden = true;
  clearDisconnectButtons();
  renderFlowsList();
  await saveAll();
}

function initFlowsTab() {
  bindPaletteDragDrop();
  bindCanvasDelegation();
  bindModal();
  document.getElementById("newFlowBtnSidebar").addEventListener("click", createNewFlow);
  document.getElementById("newFlowBtnEditor").addEventListener("click", createNewFlow);
  document.getElementById("saveFlowBtn").addEventListener("click", saveCurrentFlow);
  document.getElementById("deleteFlowBtn").addEventListener("click", deleteCurrentFlow);
  document.getElementById("flowNameInput").addEventListener("input", markFlowDirty);
  renderFlowsList();
}
