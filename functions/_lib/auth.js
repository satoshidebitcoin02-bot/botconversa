// Helpers de autenticação do painel admin. A senha nunca fica em texto puro:
// só o hash SHA-256 dela é salvo no KV, e trocar a senha não exige um novo
// deploy (diferente de usar wrangler secret).

const HASH_KEY = "admin-password-hash";

export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function getStoredHash(env) {
  return env.CONFIG_KV.get(HASH_KEY);
}

export async function verifyAdminPassword(env, password) {
  const hash = await getStoredHash(env);
  if (!hash) return false;
  const candidate = await sha256(password || "");
  return candidate === hash;
}

export async function setAdminPassword(env, password) {
  const hash = await sha256(password);
  await env.CONFIG_KV.put(HASH_KEY, hash);
}
