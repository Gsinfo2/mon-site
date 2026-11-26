export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return new Response("Photo introuvable.", { status: 404 });
  }
  const product = await env.DB.prepare(
    "SELECT photo_data, photo_type FROM products WHERE id = ? AND photo_data IS NOT NULL",
  ).bind(id).first();
  if (!product) return new Response("Photo introuvable.", { status: 404 });

  const photoBytes = Array.isArray(product.photo_data)
    ? Uint8Array.from(product.photo_data)
    : product.photo_data instanceof ArrayBuffer
      ? new Uint8Array(product.photo_data)
      : ArrayBuffer.isView(product.photo_data)
        ? new Uint8Array(
          product.photo_data.buffer,
          product.photo_data.byteOffset,
          product.photo_data.byteLength,
        )
        : null;
  if (!photoBytes?.byteLength) {
    return new Response("Les données de la photo sont illisibles.", { status: 500 });
  }

  return new Response(photoBytes, {
    headers: {
      "Content-Type": product.photo_type,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
