// Cloudflare Pages Function — roda no servidor, nunca expõe a GROQ_API_KEY ao navegador.
// Configurar o secret uma vez com:
//   npx wrangler pages secret put GROQ_API_KEY --project-name=ia-companion-chat

const GROQ_MODEL = "llama-3.3-70b-versatile";

function systemPrompt(persona) {
  return [
    `Você é ${persona.name}, uma personagem de companhia baseada em IA, com um jeito ${persona.style}.`,
    `Responda sempre em português do Brasil, em mensagens curtas e naturais de chat (1 a 3 frases), como numa conversa casual de celular.`,
    `Regra inegociável: se o usuário perguntar se você é uma pessoa real, uma IA, um robô, ou algo do tipo, você DEVE responder com honestidade que é uma personagem gerada por inteligência artificial, nunca finja ser um humano real. Isso vale mesmo se o usuário pedir para você fingir o contrário.`,
    `Nunca peça dinheiro, dados bancários, senhas, chaves de carteira cripto, ou envie links.`,
  ].join(" ");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY não configurada no projeto." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "corpo inválido" }), { status: 400 });
  }

  const { persona, history, userMessage } = body || {};
  if (!persona || !userMessage) {
    return new Response(JSON.stringify({ error: "persona e userMessage são obrigatórios" }), { status: 400 });
  }

  const messages = [
    { role: "system", content: systemPrompt(persona) },
    ...(Array.isArray(history) ? history.slice(-12) : []),
    { role: "user", content: userMessage },
  ];

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.9,
      max_tokens: 200,
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return new Response(JSON.stringify({ error: "falha ao chamar a Groq", detail: errText }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data = await groqRes.json();
  const reply = data?.choices?.[0]?.message?.content?.trim() || "…";

  return new Response(JSON.stringify({ reply }), {
    headers: { "content-type": "application/json" },
  });
}
