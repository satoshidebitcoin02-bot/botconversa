// Página de conversa — chat com uma persona de IA (sempre rotulada como IA).
// Fluxo de botões estilo ManyChat (persona.flow.nodes[]) é o mecanismo
// principal. Não há IA externa conectada — texto livre cai só no roteiro
// simulado local (data.js).

const params = new URLSearchParams(location.search);
const personaId = params.get("id");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const photoInput = document.getElementById("photoInput");
const attachPhotoBtn = document.getElementById("attachPhotoBtn");
const attachAudioBtn = document.getElementById("attachAudioBtn");
const quickRepliesEl = document.getElementById("quickReplies");

let persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
let aiMsgCount = 0;
const AD_EVERY_N_AI_MESSAGES = 4; // mostra um anúncio intersticial a cada N mensagens enviadas pela IA
const history = []; // histórico enviado pra API (role: "user" | "assistant")

async function fetchAiReply(text) {
  // sem IA externa conectada — usa direto o roteiro simulado local
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
    ? `<img class="bubble-image" src="${url}" alt="foto enviada" />`
    : `<audio class="bubble-audio" controls src="${url}"></audio>`;
  if (who === "them") {
    row.innerHTML = `<img class="mini-avatar" src="${persona.avatar}" alt="" /><div class="bubble bubble-media">${media}</div>`;
  } else {
    row.innerHTML = `<div class="bubble bubble-media">${media}</div>`;
  }
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addInlineAd() {
  const ad = randomAd();
  const wrap = document.createElement("div");
  wrap.className = "ad-inline";
  wrap.innerHTML = `
    <div class="ad-banner">📢 ${ad.title}</div>
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

// entrega uma resposta "them" já pronta (usada tanto pelo fluxo quanto pela IA),
// cuidando de som, histórico e frequência de anúncios
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

// ---- fluxo estilo ManyChat (botões de resposta rápida) ----
function renderQuickReplies(nodeIndex) {
  const flow = persona.flow;
  quickRepliesEl.innerHTML = "";
  if (!flow || !Array.isArray(flow.nodes) || nodeIndex == null) return;
  const node = flow.nodes[nodeIndex];
  if (!node || !Array.isArray(node.buttons) || node.buttons.length === 0) return;

  node.buttons.forEach(btn => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "quick-reply-btn";
    b.textContent = btn.label || "…";
    b.addEventListener("click", () => handleQuickReply(btn));
    quickRepliesEl.appendChild(b);
  });
}

async function handleQuickReply(btn) {
  quickRepliesEl.innerHTML = "";
  addBubble(btn.label || "…", "me");
  playSendSound();
  history.push({ role: "user", content: btn.label || "" });

  const nextIdx = typeof btn.next === "number" ? btn.next : -1;
  const flow = persona.flow;
  const nextNode = flow && nextIdx >= 0 ? flow.nodes[nextIdx] : null;

  showTyping();
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  hideTyping();

  if (nextNode) {
    deliverReply(nextNode.message || "…");
    renderQuickReplies(nextIdx);
  } else {
    // fim do fluxo (ou "sem ação") — devolve pra IA/roteiro simulado
    const reply = await fetchAiReply(btn.label || "");
    deliverReply(reply);
  }
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  quickRepliesEl.innerHTML = "";
  addBubble(text, "me");
  playSendSound();
  inputEl.value = "";
  history.push({ role: "user", content: text });

  showTyping();
  const minDelay = new Promise(r => setTimeout(r, 500 + Math.random() * 500));
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

  const hasFlow = persona.flow && Array.isArray(persona.flow.nodes) && persona.flow.nodes.length > 0;
  if (hasFlow) {
    const startNode = persona.flow.nodes[0];
    addBubble(startNode.message || persona.opener, "them");
    renderQuickReplies(0);
  } else {
    addBubble(persona.opener, "them");
  }
})();
