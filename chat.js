// Página de conversa — chat com uma persona de IA (sempre rotulada como IA).

const params = new URLSearchParams(location.search);
const personaId = params.get("id");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const photoInput = document.getElementById("photoInput");
const attachPhotoBtn = document.getElementById("attachPhotoBtn");
const attachAudioBtn = document.getElementById("attachAudioBtn");

let persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
let aiMsgCount = 0;
const AD_EVERY_N_AI_MESSAGES = 4; // mostra um anúncio intersticial a cada N mensagens enviadas pela IA
const history = []; // histórico enviado pra API (role: "user" | "assistant")

async function fetchAiReply(text) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona, history, userMessage: text }),
    });
    if (!res.ok) throw new Error("api error");
    const data = await res.json();
    if (!data.reply) throw new Error("sem reply");
    return data.reply;
  } catch (err) {
    // fallback pro roteiro simulado caso a API/chave não esteja configurada
    return generateReply(text);
  }
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

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  addBubble(text, "me");
  playSendSound();
  inputEl.value = "";
  history.push({ role: "user", content: text });

  showTyping();
  const minDelay = new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  const [reply] = await Promise.all([fetchAiReply(text), minDelay]);

  hideTyping();
  addBubble(reply, "them");
  playReceiveSound();
  history.push({ role: "assistant", content: reply });
  aiMsgCount += 1;

  // a cada N mensagens da IA, exibe um anúncio em pop-up que só fecha após alguns segundos
  if (aiMsgCount % AD_EVERY_N_AI_MESSAGES === 0) {
    showAdOverlay();
  } else if (aiMsgCount % 6 === 0) {
    // ocasionalmente insere um anúncio nativo dentro do fluxo de conversa
    addInlineAd();
  }
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

  addBubble(persona.opener, "them");
})();
