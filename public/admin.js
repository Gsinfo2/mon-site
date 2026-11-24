const loginPanel = document.getElementById("login-panel");
const manager = document.getElementById("manager");
const statusMessage = document.getElementById("admin-status");
const productList = document.getElementById("product-list");

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
  return result;
}

function showLogin() {
  loginPanel.hidden = false;
  manager.hidden = true;
}

function makeButton(label, action) {
  const button = document.createElement("button");
  button.className = "small-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

async function loadProducts() {
  const products = await requestJson("/api/admin/products");
  productList.replaceChildren();
  for (const product of products) {
    const row = document.createElement("article");
    row.className = "admin-row";
    if (product.photo) {
      const image = document.createElement("img");
      image.src = product.photo;
      image.alt = product.name;
      row.appendChild(image);
    } else {
      row.appendChild(document.createElement("div"));
    }

    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.name;
    const meta = document.createElement("span");
    meta.textContent = `${product.price} · ${product.available ? "Disponible" : "Masqué"}`;
    details.append(name, document.createElement("br"), meta);

    const actions = document.createElement("div");
    actions.className = "admin-actions";
    actions.appendChild(makeButton(product.available ? "Masquer" : "Afficher", async () => {
      await requestJson(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !product.available }),
      });
      await loadProducts();
    }));
    actions.appendChild(makeButton("Supprimer", async () => {
      if (!window.confirm(`Supprimer « ${product.name} » ?`)) return;
      await requestJson(`/api/admin/products/${product.id}`, { method: "DELETE" });
      await loadProducts();
    }));
    row.append(details, actions);
    productList.appendChild(row);
  }
  if (!products.length) productList.textContent = "Aucun article pour le moment.";
}

async function compressPhoto(file) {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const type of ["image/webp", "image/jpeg"]) {
      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
        if (blob && blob.size <= 1_650_000) return blob;
      }
    }
    throw new Error("Cette photo ne peut pas être réduite suffisamment. Essaie une autre photo.");
  } finally {
    image.close();
  }
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("login-error");
  error.textContent = "";
  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: new FormData(event.currentTarget).get("password") }),
    });
    loginPanel.hidden = true;
    manager.hidden = false;
    await loadProducts();
  } catch (exception) {
    error.textContent = exception.message;
  }
});

document.getElementById("product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  statusMessage.textContent = "";
  try {
    const formData = new FormData(event.currentTarget);
    const photo = event.currentTarget.elements.photo.files[0];
    if (photo) {
      const compressed = await compressPhoto(photo);
      formData.set("photo", compressed, compressed.type === "image/webp" ? "photo.webp" : "photo.jpg");
    }
    await requestJson("/api/admin/products", {
      method: "POST",
      body: formData,
    });
    event.currentTarget.reset();
    event.currentTarget.elements.available.checked = true;
    statusMessage.textContent = "Article ajouté.";
    await loadProducts();
  } catch (exception) {
    statusMessage.textContent = exception.message;
  }
});

document.getElementById("logout").addEventListener("click", async () => {
  await requestJson("/api/admin/logout", { method: "POST" });
  manager.hidden = true;
  showLogin();
});

requestJson("/api/admin/products")
  .then(async () => {
    loginPanel.hidden = true;
    manager.hidden = false;
    await loadProducts();
  })
  .catch((error) => {
    if (error.message === "Connexion requise.") showLogin();
    else statusMessage.textContent = error.message;
  });
