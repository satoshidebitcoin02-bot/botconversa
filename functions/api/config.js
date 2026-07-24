// Guarda a configuração do painel admin (logo, personas, fundo, sons) no
// Cloudflare KV, compartilhada com todo mundo que acessa o site.
// Configurar a senha do painel uma vez com:
//   npx wrangler pages secret put ADMIN_PASSWORD --project-name=ia-companion-chat

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

  const password = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "senha inválida" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

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
