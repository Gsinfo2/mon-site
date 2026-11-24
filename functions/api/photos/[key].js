export async function onRequestGet({ params, env }) {
  if (!env.PHOTOS || !/^products-[a-f0-9-]+\.(png|jpe?g|webp)$/.test(params.key)) {
    return new Response("Photo introuvable.", { status: 404 });
  }
  const object = await env.PHOTOS.get(params.key);
  if (!object) return new Response("Photo introuvable.", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
