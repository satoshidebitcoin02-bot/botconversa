import { verifyAdminPassword, setAdminPassword, getStoredHash } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "corpo inválido" }), { status: 400 });
  }

  const { newPassword, currentPassword } = body || {};
  if (!newPassword || newPassword.length < 6) {
    return new Response(JSON.stringify({ error: "a senha precisa ter pelo menos 6 caracteres" }), { status: 400 });
  }

  const existingHash = await getStoredHash(env);
  if (existingHash) {
    // já existe senha: só troca se confirmar a atual
    const ok = await verifyAdminPassword(env, currentPassword || "");
    if (!ok) {
      return new Response(JSON.stringify({ error: "senha atual incorreta" }), { status: 401 });
    }
  }

  await setAdminPassword(env, newPassword);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
