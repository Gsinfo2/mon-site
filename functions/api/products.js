import { json } from "../_auth.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Le catalogue n’est pas configuré." }, 503);
  const { results } = await env.DB.prepare(
    "SELECT id, name, category, price, condition, description, photo FROM products WHERE available = 1 ORDER BY id DESC",
  ).all();
  return json(results.map((product) => ({
    ...product,
    available: true,
    photo: product.photo
      ? product.photo.startsWith("products-")
        ? `/api/photos/${encodeURIComponent(product.photo)}`
        : `/${encodeURIComponent(product.photo)}`
      : "",
  })));
}
