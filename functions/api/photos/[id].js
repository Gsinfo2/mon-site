export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response("Photo introuvable.", { status: 404 });
  }
  const product = await env.DB.prepare(
    "SELECT photo_data, photo_type FROM products WHERE id = ? AND photo_data IS NOT NULL",
  ).bind(id).first();
  if (!product) return new Response("Photo introuvable.", { status: 404 });
  return new Response(product.photo_data, {
    headers: {
      "Content-Type": product.photo_type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
