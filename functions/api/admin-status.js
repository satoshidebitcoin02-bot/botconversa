import { getStoredHash } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const hash = await getStoredHash(context.env);
  return new Response(JSON.stringify({ hasPassword: !!hash }), {
    headers: { "content-type": "application/json" },
  });
}
