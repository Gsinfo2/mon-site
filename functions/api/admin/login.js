import { createSession, hashIp, json, requireSameOrigin, sessionCookie } from "../../_auth.js";

async function passwordMatches(submitted, expected) {
  const [submittedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(submitted)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  const left = new Uint8Array(submittedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) return json({ error: "Requête refusée." }, 403);
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12
      || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.DB) {
    return json({ error: "L’espace privé n’est pas encore configuré." }, 503);
  }

  const ipHash = await hashIp(request, env);
  const attempt = await env.DB.prepare(
    "SELECT attempts FROM login_attempts WHERE ip_hash = ? AND attempted_at > datetime('now', '-15 minutes')",
  ).bind(ipHash).first();
  if (attempt && attempt.attempts >= 5) {
    return json({ error: "Trop d’essais. Réessaie dans 15 minutes." }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Données invalides." }, 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!(await passwordMatches(password, env.ADMIN_PASSWORD))) {
    await env.DB.prepare(
      `INSERT INTO login_attempts (ip_hash, attempts, attempted_at)
       VALUES (?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(ip_hash) DO UPDATE SET
         attempts = CASE
           WHEN attempted_at <= datetime('now', '-15 minutes') THEN 1
           ELSE attempts + 1
         END,
         attempted_at = CURRENT_TIMESTAMP`,
    ).bind(ipHash).run();
    return json({ error: "Mot de passe incorrect." }, 401);
  }

  await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash = ?").bind(ipHash).run();
  return json({ ok: true }, 200, {
    "Set-Cookie": sessionCookie(request, await createSession(env)),
  });
}
