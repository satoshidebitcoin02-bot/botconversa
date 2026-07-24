// Guarda a configuração do painel admin (logo, personas, fundo, sons) no
// Cloudflare KV, compartilhada com todo mundo que acessa o site.
// A senha do painel é definida direto pelo navegador em admin.html
// (primeiro acesso), sem precisar de wrangler secret nem de novo deploy.

import { verifyAdminPassword } from "../_lib/auth.js";

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
  const ok = await verifyAdminPassword(env, password);
  if (!ok) {
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
