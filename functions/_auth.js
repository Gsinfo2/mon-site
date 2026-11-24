const encoder = new TextEncoder();
const cookieName = "gsinfo_admin";

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function equalConstantTime(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function getCookie(request) {
  const cookies = request.headers.get("Cookie") || "";
  const entry = cookies.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice(cookieName.length + 1));
  } catch {
    return "";
  }
}

export async function createSession(env) {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${expires}.${crypto.randomUUID()}`;
  return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

export async function isAuthenticated(request, env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return false;
  const token = getCookie(request);
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expires = Number(payload.split(".", 1)[0]);
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;
  return equalConstantTime(signature, await hmac(payload, env.SESSION_SECRET));
}

export function sessionCookie(request, token, maxAge = 28800) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function requireSameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return hmac(ip, env.SESSION_SECRET);
}
