// Dados das personas de IA (fictícias, sempre rotuladas como IA) e roteiro de respostas simuladas.

const PERSONAS = [];

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
