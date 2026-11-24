import { json, sessionCookie } from "../../_auth.js";

export function onRequestPost({ request }) {
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
}
