// Página de conversa — chat com uma persona automatizada (BOT, sempre
// rotulada como tal). O fluxo visual (grafo desenhado no admin, estilo
// ManyChat) é o mecanismo principal; texto livre digitado fora do fluxo
// cai no roteiro simulado local (data.js) — não há IA externa conectada.

const params = new URLSearchParams(location.search);
const personaId = params.get("id");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const photoInput = document.getElementById("photoInput");
const attachPhotoBtn = document.getElementById("attachPhotoBtn");
const attachAudioBtn = document.getElementById("attachAudioBtn");

let persona = PERSONAS[0];
let aiMsgCount = 0;
const AD_EVERY_N_AI_MESSAGES = 4; // mostra um anúncio intersticial a cada N mensagens enviadas
const history = [];

async function fetchAiReply(text) {
  return generateReply(text);
}

function addBubble(text, who) {
  const row = document.createElement("div");
  row.className = `msg-row ${who}`;
  if (who === "them") {
    row.innerHTML = `<img class="mini-avatar" src="${persona.avatar}" alt="" /><div class="bubble"></div>`;
  } else {
    row.innerHTML = `<div class="bubble"></div>`;
  }
  row.querySelector(".bubble").textContent = text;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function addMediaBubble(kind, url, who) {
  const row = document.createElement("div");
  row.className = `msg-row ${who}`;
  const media = kind === "image"
    ? `<img class="bubble-image" src="${url}" alt="mídia" />`
    : `<audio class="bubble-audio" controls src="${url}"></audio>`;
  if (who === "them") {
    row.innerHTML = `<img class="mini-avatar" src="${persona.avatar}" alt="" /><div class="bubble bubble-media">${media}</div>`;
  } else {
    row.innerHTML = `<div class="bubble bubble-media">${media}</div>`;
  }
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addDocumentBubble(filename, url) {
  const row = document.createElement("div");
  row.className = "msg-row them";
  row.innerHTML = `
    <img class="mini-avatar" src="${persona.avatar}" alt="" />
    <a class="bubble bubble-doc" href="${url || "#"}" target="_blank" rel="noopener">${icon("file-text", 14)} ${filename || "documento"}</a>
  `;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addContactBubble(name, phone) {
  const row = document.createElement("div");
  row.className = "msg-row them";
  row.innerHTML = `
    <img class="mini-avatar" src="${persona.avatar}" alt="" />
    <div class="bubble bubble-contact">${icon("user", 14)} <strong>${name || "Contato"}</strong>${phone ? "<br>" + phone : ""}</div>
  `;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addInlineAd() {
  const ad = randomAd();
  const wrap = document.createElement("div");
  wrap.className = "ad-inline";
  wrap.innerHTML = `
    <div class="ad-banner">${icon("megaphone", 16)} ${ad.title}</div>
    <div class="ad-meta">
      <span>${ad.body}</span>
      <span>${ad.label}</span>
    </div>
  `;
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "msg-row them";
  row.id = "typingRow";
  row.innerHTML = `
    <img class="mini-avatar" src="${persona.avatar}" alt="" />
    <div class="typing-indicator"><span></span><span></span><span></span></div>
  `;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const row = document.getElementById("typingRow");
  if (row) row.remove();
}

function showAdOverlay() {
  const overlay = document.getElementById("adOverlay");
  const ad = randomAd();
  document.getElementById("adBigTitle").textContent = ad.title;
  document.getElementById("adBigBody").textContent = ad.body;
  const closeBtn = document.getElementById("adCloseBtn");
  closeBtn.disabled = true;

  let secs = 5;
  closeBtn.textContent = `Fechar (${secs})`;
  overlay.classList.add("show");

  const timer = setInterval(() => {
    secs -= 1;
    if (secs <= 0) {
      clearInterval(timer);
      closeBtn.disabled = false;
      closeBtn.textContent = "Fechar";
    } else {
      closeBtn.textContent = `Fechar (${secs})`;
    }
  }, 1000);

  closeBtn.onclick = () => {
    if (closeBtn.disabled) return;
    overlay.classList.remove("show");
  };
}

function deliverReply(text) {
  addBubble(text, "them");
  playReceiveSound();
  history.push({ role: "assistant", content: text });
  aiMsgCount += 1;

  if (aiMsgCount % AD_EVERY_N_AI_MESSAGES === 0) {
    showAdOverlay();
  } else if (aiMsgCount % 6 === 0) {
    addInlineAd();
  }
}

function sleepRandom() {
  return new Promise(r => setTimeout(r, 500 + Math.random() * 500));
}

// ---- motor do fluxo visual (grafo estilo ManyChat) ----
const flowRuntime = { nodes: null, waitingForReply: false, currentNodeId: null };

function getGraphNodes(flow) {
  return (flow && flow.graph && flow.graph.drawflow && flow.graph.drawflow.Home && flow.graph.drawflow.Home.data) || {};
}

function findStartNodeId(nodes) {
  const ids = Object.keys(nodes);
  const withIncoming = new Set();
  ids.forEach(id => {
    Object.values(nodes[id].outputs || {}).forEach(out => {
      (out.connections || []).forEach(conn => withIncoming.add(String(conn.node)));
    });
  });
  return ids.find(id => !withIncoming.has(String(id))) || ids[0] || null;
}

function nextNodeId(node, outputKey) {
  const out = node.outputs && node.outputs[outputKey || "output_1"];
  const conn = out && out.connections && out.connections[0];
  return conn ? String(conn.node) : null;
}

function pickRandomizerOutput(node) {
  const branches = (node.data && node.data.branches) || [];
  const total = branches.reduce((s, b) => s + (Number(b.weight) || 0), 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < branches.length; i++) {
    r -= Number(branches[i].weight) || 0;
    if (r <= 0) return `output_${i + 1}`;
  }
  return "output_1";
}

async function runFlowFrom(nodeId) {
  const nodes = flowRuntime.nodes;
  let id = nodeId;
  while (id) {
    const node = nodes[id];
    if (!node) break;

    if (node.name === "text") {
      showTyping();
      await sleepRandom();
      hideTyping();
      deliverReply((node.data && node.data.message) || "…");
      id = nextNodeId(node);
    } else if (node.name === "delay") {
      const secs = Math.min(Number(node.data && node.data.seconds) || 1, 120);
      await new Promise(r => setTimeout(r, secs * 1000));
      id = nextNodeId(node);
    } else if (node.name === "randomizer") {
      id = nextNodeId(node, pickRandomizerOutput(node));
    } else if (node.name === "wait") {
      flowRuntime.waitingForReply = true;
      flowRuntime.currentNodeId = id;
      return;
    } else if (node.name === "audio" || node.name === "media") {
      showTyping();
      await sleepRandom();
      hideTyping();
      addMediaBubble(node.name === "audio" ? "audio" : "image", (node.data && node.data.url) || "", "them");
      playReceiveSound();
      id = nextNodeId(node);
    } else if (node.name === "document") {
      showTyping();
      await sleepRandom();
      hideTyping();
      addDocumentBubble((node.data && node.data.filename) || "documento", (node.data && node.data.url) || "");
      playReceiveSound();
      id = nextNodeId(node);
    } else if (node.name === "contact") {
      showTyping();
      await sleepRandom();
      hideTyping();
      addContactBubble((node.data && node.data.name) || "Contato", (node.data && node.data.phone) || "");
      playReceiveSound();
      id = nextNodeId(node);
    } else {
      id = nextNodeId(node);
    }
  }
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  addBubble(text, "me");
  playSendSound();
  inputEl.value = "";
  history.push({ role: "user", content: text });

  if (flowRuntime.waitingForReply && flowRuntime.nodes) {
    flowRuntime.waitingForReply = false;
    const node = flowRuntime.nodes[flowRuntime.currentNodeId];
    await runFlowFrom(nextNodeId(node));
    return;
  }

  showTyping();
  const minDelay = sleepRandom();
  const [reply] = await Promise.all([fetchAiReply(text), minDelay]);
  hideTyping();
  deliverReply(reply);
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ---- anexar foto ----
attachPhotoBtn.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  addMediaBubble("image", url, "me");
  playSendSound();
  photoInput.value = "";
});

// ---- gravar áudio ----
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
  if (isRecording) {
    mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      addMediaBubble("audio", url, "me");
      playSendSound();
      stream.getTracks().forEach(t => t.stop());
      isRecording = false;
      attachAudioBtn.classList.remove("recording");
    };
    mediaRecorder.start();
    isRecording = true;
    attachAudioBtn.classList.add("recording");
  } catch {
    alert("Não foi possível acessar o microfone.");
  }
}

attachAudioBtn.addEventListener("click", toggleRecording);

// ---- inicialização ----
(async function init() {
  const config = await loadSiteConfig();
  const personas = mergedPersonas(config);
  persona = personas.find(p => p.id === personaId) || personas[0];
  setSoundsEnabled(config.soundsEnabled);
  applyBackground(config);

  document.getElementById("hdrAvatar").src = persona.avatar;
  document.getElementById("hdrName").textContent = persona.name;

  const flow = findFlowForPersona(config, persona.id);
  const nodes = flow ? getGraphNodes(flow) : {};
  const startId = flow ? findStartNodeId(nodes) : null;

  if (flow && startId) {
    flowRuntime.nodes = nodes;
    await runFlowFrom(startId);
  } else {
    addBubble(persona.opener, "them");
  }
})();
