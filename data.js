// Dados das personas de IA (fictícias, sempre rotuladas como IA) e roteiro de respostas simuladas.

const PERSONAS = [
  {
    id: "luna",
    name: "Luna",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc",
    opener: "Oi! Vi que você entrou agora 👋 tudo bem?",
    style: "descontraída e curiosa",
  },
  {
    id: "mia",
    name: "Mia",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=d5e8ff",
    opener: "Ei, boa noite! Como foi seu dia? 😊",
    style: "calma e atenciosa",
  },
  {
    id: "nina",
    name: "Nina",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nina&backgroundColor=fff0c2",
    opener: "Oiii! Adoraria saber mais sobre você, começa aí 🙂",
    style: "animada e brincalhona",
  },
  {
    id: "sofia",
    name: "Sofia",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=d9ffd5",
    opener: "Olá! Que bom te ver por aqui. O que você anda fazendo?",
    style: "gentil e reflexiva",
  },
  {
    id: "bia",
    name: "Bia",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bia&backgroundColor=ffe0c2",
    opener: "Oi! Que bom te ver online agora, bora trocar uma ideia?",
    style: "extrovertida e divertida",
  },
  {
    id: "carla",
    name: "Carla",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carla&backgroundColor=e0d5ff",
    opener: "Oii, tudo certo? Me fala um pouco sobre o seu dia.",
    style: "carinhosa e paciente",
  },
  {
    id: "duda",
    name: "Duda",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Duda&backgroundColor=ffd5f0",
    opener: "Ei! Vi que você chegou agora, que coincidência boa 😄",
    style: "espontânea e engraçada",
  },
  {
    id: "elis",
    name: "Elis",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elis&backgroundColor=c2f0ff",
    opener: "Oi, tudo bem por aí? Fico feliz em falar com você.",
    style: "doce e tranquila",
  },
  {
    id: "fernanda",
    name: "Fernanda",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda&backgroundColor=fff5c2",
    opener: "Oiii! Já estava online esperando alguém pra conversar 😊",
    style: "curiosa e falante",
  },
  {
    id: "gabi",
    name: "Gabi",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gabi&backgroundColor=d5fff0",
    opener: "Oi! Entrei agora também, que sorte a nossa 😊",
    style: "gentil e comunicativa",
  },
];

// Banco de respostas roteirizadas por "intenção" simples detectada na mensagem do usuário.
const RESPONSE_BANK = {
  greeting: [
    "Oi! Que bom te ver por aqui 😊",
    "Olá! Tava justamente pensando em quem apareceria no chat.",
    "Ei! Bom te falar de novo.",
  ],
  howAreYou: [
    "Tô bem, obrigada por perguntar! E você, como tá?",
    "Indo bem por aqui! Me conta como foi seu dia.",
    "Tudo tranquilo. E aí, novidades?",
  ],
  compliment: [
    "Haha, que gentil da sua parte 😄",
    "Aaah, obrigada! Você também parece ser gente boa.",
    "Que fofo, obrigada por dizer isso!",
  ],
  question: [
    "Boa pergunta! Deixa eu pensar... eu diria que sim.",
    "Depende bastante, mas no geral eu acho que sim.",
    "Hmm, nunca tinha pensado assim, mas gostei da pergunta.",
  ],
  bye: [
    "Tá bom, até mais! Foi legal conversar 👋",
    "Combinado, falamos depois!",
    "Beleza, até a próxima conversa!",
  ],
  default: [
    "Interessante, me conta mais sobre isso.",
    "Sério? Não sabia disso, adorei saber.",
    "Legal! E o que mais você curte fazer?",
    "Haha entendi. Continua, tô curiosa pra saber o resto.",
    "Faz sentido. E como você se sente em relação a isso?",
  ],
};

function pickIntent(text) {
  const t = text.toLowerCase();
  if (/\b(oi|ola|olá|opa|eae|e ai|e aí)\b/.test(t)) return "greeting";
  if (/(tudo bem|como (vc|você) (ta|tá|esta|está)|de boa)/.test(t)) return "howAreYou";
  if (/(linda|linda|bonita|gata|maravilhosa|incrivel|incrível)/.test(t)) return "compliment";
  if (/\?/.test(t)) return "question";
  if (/\b(tchau|falou|até mais|ate mais|bjs|flw)\b/.test(t)) return "bye";
  return "default";
}

function generateReply(text) {
  const intent = pickIntent(text);
  const options = RESPONSE_BANK[intent];
  return options[Math.floor(Math.random() * options.length)];
}

// Anúncios fictícios (placeholders — nenhum link real)
const ADS = [
  { label: "Patrocinado", title: "App Fitness Pro", body: "Treinos personalizados em 15 min por dia." },
  { label: "Patrocinado", title: "Delivery Rápido", body: "Peça sua comida favorita com 20% off hoje." },
  { label: "Patrocinado", title: "Streaming+", body: "Filmes e séries ilimitados por R$9,90/mês." },
  { label: "Patrocinado", title: "Curso Online", body: "Aprenda uma nova habilidade em 30 dias." },
];

function randomAd() {
  return ADS[Math.floor(Math.random() * ADS.length)];
}
