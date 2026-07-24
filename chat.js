// Página de conversa — chat simulado com uma persona de IA (sempre rotulada como IA).

const params = new URLSearchParams(location.search);
const persona = PERSONAS.find(p => p.id === params.get("id")) || PERSONAS[0];

document.getElementById("hdrAvatar").src = persona.avatar;
document.getElementById("hdrName").textContent = persona.name;

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

let aiMsgCount = 0;
const AD_EVERY_N_AI_MESSAGES = 4; // mostra um anúncio intersticial a cada N mensagens enviadas pela IA

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

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  addBubble(text, "me");
  inputEl.value = "";

  showTyping();
  const delay = 700 + Math.random() * 900;
  setTimeout(() => {
    hideTyping();
    const reply = generateReply(text);
    addBubble(reply, "them");
    aiMsgCount += 1;

    // a cada N mensagens da IA, exibe um anúncio em pop-up que só fecha após alguns segundos
    if (aiMsgCount % AD_EVERY_N_AI_MESSAGES === 0) {
      showAdOverlay();
    } else if (aiMsgCount % 6 === 0) {
      // ocasionalmente insere um anúncio nativo dentro do fluxo de conversa
      addInlineAd();
    }
  }, delay);
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// mensagem inicial da persona
addBubble(persona.opener, "them");
