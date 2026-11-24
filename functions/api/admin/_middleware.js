import { isAuthenticated, json, requireSameOrigin } from "../../_auth.js";

export async function onRequest({ request, env, next }) {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/api/admin/login" && request.method === "POST") {
    if (!requireSameOrigin(request)) return json({ error: "Requête refusée." }, 403);
    return next();
  }
  if (!(await isAuthenticated(request, env))) {
    return json({ error: "Connexion requise." }, 401);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !requireSameOrigin(request)) {
    return json({ error: "Requête refusée." }, 403);
  }
  return next();
}
