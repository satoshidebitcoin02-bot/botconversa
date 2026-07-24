import { verifyAdminPassword } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const password = request.headers.get("x-admin-password") || "";
  const ok = await verifyAdminPassword(env, password);
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { "content-type": "application/json" },
  });
}
