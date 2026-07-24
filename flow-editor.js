// Editor visual de fluxos (canvas com nós conectados por linha, estilo
// ManyChat), usando a biblioteca Drawflow. Cada fluxo é salvo em
// config.flows[id] = { id, name, personaIds: [...], graph: <export do Drawflow> }.

let flowsDraft = {}; // { [flowId]: { id, name, personaIds, graph } }
let dfEditor = null;
let currentFlowId = null;

const NODE_META = {
  delay: { title: "⏱ Delay", inputs: 1, outputs: 1 },
  randomizer: { title: "🔀 Randomizer", inputs: 1, outputs: 4 },
  wait: { title: "👤 Aguardar Resposta", inputs: 1, outputs: 1 },
  audio: { title: "🎙 Áudio", inputs: 1, outputs: 1 },
  contact: { title: "👤 Contato", inputs: 1, outputs: 1 },
  document: { title: "📄 Documento", inputs: 1, outputs: 1 },
  media: { title: "🖼 Mídia", inputs: 1, outputs: 1 },
  text: { title: "💬 Texto", inputs: 1, outputs: 1 },
};

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

function nodeHtml(type, data) {
  const meta = NODE_META[type];
  const title = `<div class="df-node-title">${meta.title}</div>`;

  if (type === "text") {
    return `<div class="df-node">${title}<textarea class="df-field" data-field="message" rows="3" placeholder="Mensagem que ela envia...">${data.message || ""}</textarea></div>`;
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
      <label class="df-upload-btn">📁 Enviar arquivo<input type="file" accept="${accept}" class="df-file" data-field="url" hidden /></label>
      <div class="df-file-name">${data.url ? "✅ arquivo carregado" : "nenhum arquivo"}</div>
    </div>`;
  }
  if (type === "document") {
    return `<div class="df-node">${title}
      <label class="df-upload-btn">📁 Enviar arquivo<input type="file" class="df-file" data-field="url" data-filename-field="filename" hidden /></label>
      <div class="df-file-name">${data.filename ? "📄 " + data.filename : "nenhum arquivo"}</div>
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
}

function addNodeToCanvas(type, clientX, clientY) {
  const meta = NODE_META[type];
  const precanvas = dfEditor.precanvas;
  const rect = precanvas.getBoundingClientRect();
  const posX = (clientX - rect.x) / dfEditor.zoom;
  const posY = (clientY - rect.y) / dfEditor.zoom;

  const initialData = type === "randomizer"
    ? { branches: [{ weight: 25 }, { weight: 25 }, { weight: 25 }, { weight: 25 }] }
    : {};

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

function bindCanvasDelegation() {
  const container = document.getElementById("drawflowCanvas");

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
    const label = nodeEl.querySelector(".df-file-name");
    if (label) label.textContent = e.target.dataset.filenameField ? "📄 " + file.name : "✅ arquivo carregado";
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
  const list = document.getElementById("flowsList");
  const flows = Object.values(flowsDraft);
  if (flows.length === 0) {
    list.innerHTML = `<p class="admin-status">Nenhum fluxo criado ainda.</p>`;
    return;
  }
  list.innerHTML = flows.map(f => `
    <div class="flow-list-item ${f.id === currentFlowId ? "active" : ""}" data-flow-id="${f.id}">
      <span>${f.name || "(sem nome)"}</span>
      <span class="flow-persona-count">${(f.personaIds || []).length} personagem(ns)</span>
    </div>
  `).join("");

  list.querySelectorAll(".flow-list-item").forEach(el => {
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
}

function getSelectedPersonaIds() {
  return Array.from(document.querySelectorAll("#flowPersonaAssign input:checked")).map(i => i.value);
}

function openFlow(flowId) {
  currentFlowId = flowId;
  const flow = flowsDraft[flowId];

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
  const id = "flow_" + Date.now();
  flowsDraft[id] = { id, name: "Novo fluxo", personaIds: [], graph: null };
  openFlow(id);
}

function saveCurrentFlow() {
  if (!currentFlowId) return;
  const flow = flowsDraft[currentFlowId];
  flow.name = document.getElementById("flowNameInput").value.trim() || "Fluxo sem nome";
  flow.personaIds = getSelectedPersonaIds();
  flow.graph = dfEditor.export();
  renderFlowsList();
  const status = document.getElementById("flowSaveStatus");
  status.textContent = "Fluxo salvo neste rascunho — clique em uma aba e depois em Salvar alterações pra publicar.";
  status.className = "admin-status success";
}

function deleteCurrentFlow() {
  if (!currentFlowId) return;
  delete flowsDraft[currentFlowId];
  currentFlowId = null;
  document.getElementById("flowEditorWrap").hidden = true;
  renderFlowsList();
}

function closeFlowEditor() {
  document.getElementById("flowEditorWrap").hidden = true;
  currentFlowId = null;
  renderFlowsList();
}

function initFlowsTab() {
  bindPaletteDragDrop();
  bindCanvasDelegation();
  document.getElementById("newFlowBtn").addEventListener("click", createNewFlow);
  document.getElementById("saveFlowBtn").addEventListener("click", saveCurrentFlow);
  document.getElementById("deleteFlowBtn").addEventListener("click", deleteCurrentFlow);
  document.getElementById("closeFlowEditorBtn").addEventListener("click", closeFlowEditor);
}
