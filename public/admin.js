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
    await requestJson("/api/admin/products", {
      method: "POST",
      body: new FormData(event.currentTarget),
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
