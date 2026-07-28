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
const quickRepliesEl = document.getElementById("quickReplies");
const iconMic  = sendBtn.querySelector(".icon-mic");
const iconSend = sendBtn.querySelector(".icon-send");

let persona = PERSONAS[0];
const history = [];


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
  const media = `<img class="bubble-image" src="${url}" alt="mídia" />`;
  if (who === "them") {
    row.innerHTML = `<img class="mini-avatar" src="${persona.avatar}" alt="" /><div class="bubble bubble-media">${media}</div>`;
  } else {
    row.innerHTML = `<div class="bubble bubble-media">${media}</div>`;
  }
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addAudioBubble(url, who) {
  const row = document.createElement("div");
  row.className = `msg-row ${who}`;

  const bars = Array.from({ length: 30 }, () => {
    const h = 4 + Math.random() * 20;
    const delay = (Math.random() * 0.6).toFixed(2);
    return `<span class="audio-bar" style="height:${h}px;animation-delay:${delay}s"></span>`;
  }).join("");

  const meClass = who === "me" ? " audio-bubble-me" : "";
  const bubbleHTML = `
    <div class="audio-bubble${meClass}">
      <button class="audio-play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor" width="45" height="45"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="audio-waveform">${bars}</div>
      <span class="audio-duration">0:00</span>
      <audio src="${url}"></audio>
    </div>`;

  row.innerHTML = who === "them"
    ? `<img class="mini-avatar" src="${persona.avatar}" alt="" />${bubbleHTML}`
    : bubbleHTML;

  const bubble = row.querySelector(".audio-bubble");
  const btn    = row.querySelector(".audio-play-btn");
  const durEl  = row.querySelector(".audio-duration");
  const audio  = row.querySelector("audio");

  const playIcon  = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>`;
  const pauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

  const fmt = s => {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  };

  audio.addEventListener("loadedmetadata", () => { durEl.textContent = fmt(audio.duration); });
  audio.addEventListener("timeupdate",     () => { durEl.textContent = fmt(audio.currentTime); });
  audio.addEventListener("ended", () => {
    btn.innerHTML = playIcon;
    bubble.classList.remove("playing");
    durEl.textContent = fmt(audio.duration);
  });

  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      btn.innerHTML = pauseIcon;
      bubble.classList.add("playing");
    } else {
      audio.pause();
      btn.innerHTML = playIcon;
      bubble.classList.remove("playing");
    }
  });

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addCarouselBubble(urls) {
  const row = document.createElement("div");
  row.className = "msg-row them";
  const imgs = urls.map(u => `<img class="carousel-img" src="${u}" alt="" />`).join("");
  row.innerHTML = `
    <img class="mini-avatar" src="${persona.avatar}" alt="" />
    <div class="bubble bubble-media"><div class="carousel-track">${imgs}</div></div>
  `;
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

function deliverReply(text) {
  addBubble(text, "them");
  playReceiveSound();
  history.push({ role: "assistant", content: text });
}

function sleepRandom() {
  return new Promise(r => setTimeout(r, 500 + Math.random() * 500));
}

// ---- motor do fluxo visual (grafo estilo ManyChat) ----
const flowRuntime = { nodes: null, waitingForReply: false, currentNodeId: null, pendingButtonNodeId: null };

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

      const buttons = ((node.data && node.data.buttons) || [])
        .map((b, i) => ({ label: (b.label || "").trim(), url: (b.url || "").trim(), outputKey: `output_${i + 1}` }))
        .filter(b => b.label);

      if (buttons.length > 0) {
        flowRuntime.pendingButtonNodeId = id;
        renderTextButtons(buttons);
        return;
      }
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
    } else if (node.name === "audio") {
      showTyping();
      await sleepRandom();
      hideTyping();
      addAudioBubble((node.data && node.data.url) || "", "them");
      playReceiveSound();
      id = nextNodeId(node);
    } else if (node.name === "media") {
      showTyping();
      await sleepRandom();
      hideTyping();
      const urls = (node.data && node.data.urls) || [];
      if (urls.length > 1) {
        addCarouselBubble(urls);
      } else {
        addMediaBubble("image", urls[0] || "", "them");
      }
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

function clearInlineButtons() {
  const old = document.getElementById("inlineButtons");
  if (old) old.remove();
}

function renderTextButtons(buttons) {
  clearInlineButtons();
  const row = document.createElement("div");
  row.id = "inlineButtons";
  row.className = "inline-buttons-row";
  buttons.forEach(btn => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quick-reply-btn";
    b.textContent = btn.label;
    b.addEventListener("click", () => handleTextButtonClick(btn));
    row.appendChild(b);
  });
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function handleTextButtonClick(btn) {
  clearInlineButtons();

  if (btn.url) {
    const url = /^https?:\/\//i.test(btn.url) ? btn.url : "https://" + btn.url;
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const nodeId = flowRuntime.pendingButtonNodeId;
  flowRuntime.pendingButtonNodeId = null;
  if (!nodeId || !flowRuntime.nodes) return;
  const node = flowRuntime.nodes[nodeId];

  addBubble(btn.label, "me");
  playSendSound();
  history.push({ role: "user", content: btn.label });

  await runFlowFrom(nextNodeId(node, btn.outputKey));
}

function setSendMode(hasText) {
  if (hasText) {
    sendBtn.classList.remove("send-btn--mic");
    sendBtn.title = "Enviar";
    iconMic.setAttribute("hidden", "");
    iconSend.removeAttribute("hidden");
  } else {
    sendBtn.classList.add("send-btn--mic");
    sendBtn.title = "Gravar áudio";
    iconMic.removeAttribute("hidden");
    iconSend.setAttribute("hidden", "");
  }
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  clearInlineButtons();
  flowRuntime.pendingButtonNodeId = null;
  addBubble(text, "me");
  playSendSound();
  inputEl.value = "";
  setSendMode(false);
  history.push({ role: "user", content: text });

  if (flowRuntime.waitingForReply && flowRuntime.nodes) {
    flowRuntime.waitingForReply = false;
    const node = flowRuntime.nodes[flowRuntime.currentNodeId];
    await runFlowFrom(nextNodeId(node));
  }
}

sendBtn.addEventListener("click", () => {
  if (inputEl.value.trim()) {
    sendMessage();
  } else {
    toggleRecording();
  }
});

inputEl.addEventListener("input", () => setSendMode(inputEl.value.trim().length > 0));
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
let recStream = null;
let recTimerInterval = null;

const recordingBar  = document.getElementById("recordingBar");
const recTimerEl    = document.getElementById("recTimer");
const pauseRecBtn   = document.getElementById("pauseRecBtn");
const pillInput     = document.getElementById("msgInput");

function startRecTimer() {
  let secs = 0;
  recTimerEl.textContent = "0:00";
  recTimerInterval = setInterval(() => {
    secs++;
    recTimerEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  }, 1000);
}

function stopRecTimer() {
  clearInterval(recTimerInterval);
  recTimerInterval = null;
}

function enterRecordingUI() {
  attachPhotoBtn.hidden = true;
  pillInput.hidden      = true;
  recordingBar.hidden   = false;
  setSendMode(true);
}

function leaveRecordingUI() {
  attachPhotoBtn.hidden = false;
  pillInput.hidden      = false;
  recordingBar.hidden   = true;
  setSendMode(pillInput.value.trim().length > 0);
}

async function toggleRecording() {
  if (isRecording) {
    mediaRecorder.stop();
    return;
  }
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(recStream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      addAudioBubble(url, "me");
      playSendSound();
      recStream.getTracks().forEach(t => t.stop());
      isRecording = false;
      stopRecTimer();
      leaveRecordingUI();
    };
    mediaRecorder.start();
    isRecording = true;
    enterRecordingUI();
    startRecTimer();
  } catch {
    alert("Não foi possível acessar o microfone.");
  }
}

pauseRecBtn.addEventListener("click", () => {
  if (!mediaRecorder) return;
  if (mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    clearInterval(recTimerInterval);
    recTimerInterval = null;
    pauseRecBtn.innerHTML = `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  } else if (mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    startRecTimer();
    pauseRecBtn.innerHTML = `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  }
});


// ---- inicialização ----
(async function init() {
  // Preenche o header imediatamente com os dados padrão (sem esperar a rede)
  const defaultPersonas = mergedPersonas({});
  persona = defaultPersonas.find(p => p.id === personaId) || defaultPersonas[0];
  document.getElementById("hdrAvatar").src = persona.avatar;
  document.getElementById("hdrName").textContent = persona.name;

  // Atualiza com dados do config (pode sobrescrever se houver customização)
  const config = await loadSiteConfig();
  const personas = mergedPersonas(config);
  persona = personas.find(p => p.id === personaId) || personas[0];
  setSoundsEnabled(config.soundsEnabled);
  applyColors(config);
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
