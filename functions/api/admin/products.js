import { json } from "../../_auth.js";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxPhotoSize = 1_650_000;

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
    `SELECT id, name, category, price, condition, description, photo, available,
            photo_data IS NOT NULL AS has_photo
     FROM products ORDER BY id DESC`,
  ).all();
  return json(results.map((product) => ({
    ...product,
    available: Boolean(product.available),
    photo: product.has_photo
      ? `/api/photos/${product.id}`
      : product.photo ? `/${encodeURIComponent(product.photo)}` : "",
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
  let photoBytes = null;
  let photoType = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > maxPhotoSize || !allowedTypes.has(photo.type)) {
      return json({ error: "La photo est trop volumineuse. Réduis-la puis réessaie." }, 400);
    }
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!hasValidSignature(photo.type, bytes)) {
      return json({ error: "Le fichier ne semble pas être une image valide." }, 400);
    }
    photoBytes = bytes;
    photoType = photo.type;
  }

  await env.DB.prepare(
    `INSERT INTO products
     (name, category, price, condition, description, photo, photo_data, photo_type, available)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, ?)`,
  ).bind(
    name,
    String(form.get("category") || "ARTICLE").trim().slice(0, 80),
    price,
    String(form.get("condition") || "").trim().slice(0, 120),
    String(form.get("description") || "").trim().slice(0, 2000),
    photoBytes,
    photoType,
    form.get("available") === "on" ? 1 : 0,
  ).run();
  return json({ ok: true }, 201);
}
