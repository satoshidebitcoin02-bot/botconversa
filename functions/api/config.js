// Guarda a configuração do painel admin (logo, personas, fundo, sons) no
// Cloudflare KV, compartilhada com todo mundo que acessa o site.
// admin.html não fica atrás de login — a URL não é linkada em nenhum
// lugar do site público, então é "secreta por não estar visível".

const KV_KEY = "site-config";

export async function onRequestGet(context) {
  const { env } = context;
  const raw = await env.CONFIG_KV.get(KV_KEY);
  return new Response(raw || "{}", {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "corpo inválido" }), { status: 400 });
  }

  await env.CONFIG_KV.put(KV_KEY, JSON.stringify(body));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
