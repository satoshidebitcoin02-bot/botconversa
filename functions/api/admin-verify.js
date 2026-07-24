// Só confirma se a senha do painel admin está correta, sem alterar nada.

export async function onRequestGet(context) {
  const { request, env } = context;
  const password = request.headers.get("x-admin-password") || "";
  const ok = !!env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { "content-type": "application/json" },
  });
}
