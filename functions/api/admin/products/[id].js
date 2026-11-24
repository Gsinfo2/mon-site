import { json } from "../../../_auth.js";

export async function onRequestPatch({ params, request, env }) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Article invalide." }, 400);
  const body = await request.json();
  if (typeof body.available !== "boolean") {
    return json({ error: "Disponibilité invalide." }, 400);
  }
  const result = await env.DB.prepare(
    "UPDATE products SET available = ? WHERE id = ?",
  ).bind(body.available ? 1 : 0, id).run();
  if (!result.meta.changes) return json({ error: "Article introuvable." }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Article invalide." }, 400);
  const product = await env.DB.prepare("SELECT photo FROM products WHERE id = ?").bind(id).first();
  if (!product) return json({ error: "Article introuvable." }, 404);
  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  if (product.photo.startsWith("products-")) await env.PHOTOS.delete(product.photo);
  return json({ ok: true });
}
