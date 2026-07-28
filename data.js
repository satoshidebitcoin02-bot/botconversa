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
