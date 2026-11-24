import { json } from "../../_auth.js";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function hasValidSignature(type, bytes) {
  if (type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10]
      .every((byte, index) => bytes[index] === byte);
  }
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  return type === "image/webp" && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM products ORDER BY id DESC",
  ).all();
  return json(results.map((product) => ({
    ...product,
    available: Boolean(product.available),
    photo: product.photo
      ? product.photo.startsWith("products-")
        ? `/api/photos/${encodeURIComponent(product.photo)}`
        : `/${encodeURIComponent(product.photo)}`
      : "",
  })));
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const price = String(form.get("price") || "").trim();
  if (!name || !price || name.length > 160 || price.length > 40) {
    return json({ error: "Le nom et le prix sont obligatoires." }, 400);
  }

  let photoKey = "";
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 10 * 1024 * 1024 || !allowedTypes.has(photo.type)) {
      return json({ error: "Choisis une image PNG, JPG ou WEBP de 10 Mo maximum." }, 400);
    }
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!hasValidSignature(photo.type, bytes)) {
      return json({ error: "Le fichier ne semble pas être une image valide." }, 400);
    }
    photoKey = `products-${crypto.randomUUID()}.${allowedTypes.get(photo.type)}`;
    await env.PHOTOS.put(photoKey, bytes, {
      httpMetadata: { contentType: photo.type },
    });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO products
       (name, category, price, condition, description, photo, available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      name,
      String(form.get("category") || "ARTICLE").trim().slice(0, 80),
      price,
      String(form.get("condition") || "").trim().slice(0, 120),
      String(form.get("description") || "").trim().slice(0, 2000),
      photoKey,
      form.get("available") === "on" ? 1 : 0,
    ).run();
  } catch (error) {
    if (photoKey) await env.PHOTOS.delete(photoKey);
    throw error;
  }
  return json({ ok: true }, 201);
}
