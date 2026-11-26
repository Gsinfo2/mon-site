const CATALOG_API_URL = '/api/products';
const MESSENGER_URL = 'https://m.me/gsinfo233';

const yearElement = document.getElementById('year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

const productGrid = document.getElementById('product-grid');
if (productGrid) loadCatalog();

async function loadCatalog() {
  const message = document.getElementById('catalog-message');
  try {
    let rows;
    let usingFallback = false;
    try {
      const response = await fetch(CATALOG_API_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Réponse HTTP ${response.status}`);
      rows = await response.json();
    } catch (apiError) {
      const fallback = await fetch('./products.json', { cache: 'no-store' });
      if (!fallback.ok) throw apiError;
      rows = await fallback.json();
      usingFallback = true;
    }
    if (!Array.isArray(rows)) throw new Error('Format de catalogue invalide.');
    const products = rows.map((product, index) => ({ ...product, index }));

    productGrid.replaceChildren();
    if (!products.length) {
      if (message) message.textContent = 'Aucun article disponible pour le moment. Revenez bientôt !';
      return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => fragment.appendChild(createProductCard(product)));
    productGrid.appendChild(fragment);
    if (message) message.textContent = usingFallback
      ? 'Catalogue temporaire — la gestion en ligne sera disponible après la configuration.'
      : '';
  } catch (error) {
    console.error('Impossible de charger le catalogue local :', error);
    productGrid.replaceChildren();
    if (message) message.textContent = 'Le catalogue n’a pas pu être chargé. Actualisez la page dans quelques instants.';
  } finally {
    productGrid.setAttribute('aria-busy', 'false');
  }
}

const adminShortcut = document.querySelector('.admin-fab');
if (adminShortcut && window.location.hostname.endsWith('github.io')) {
  adminShortcut.hidden = true;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.id = `article-${slugify(product.name)}-${product.index + 1}`;

  const photo = normalizePhotoUrl(product.photo);
  if (photo) {
    const photoLink = document.createElement('a');
    photoLink.className = 'product-photo';
    photoLink.href = photo.link;
    photoLink.target = '_blank';
    photoLink.rel = 'noopener noreferrer';

    const image = document.createElement('img');
    image.src = photo.image;
    image.alt = product.name;
    image.loading = 'lazy';
    image.onerror = () => {
      if (photo.fallback && image.src !== photo.fallback) {
        image.src = photo.fallback;
        return;
      }
      photoLink.replaceChildren();
      photoLink.removeAttribute('href');
      photoLink.classList.add('photo-unavailable');
      photoLink.textContent = 'Photo inaccessible — vérifiez que le fichier est encore disponible.';
      console.warn(`Photo non chargée pour « ${product.name} »:`, photo.image);
    };
    photoLink.appendChild(image);
    card.appendChild(photoLink);
  }

  const content = document.createElement('div');
  content.className = 'product-content';
  const topLine = document.createElement('div');
  topLine.className = 'product-topline';
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = product.category.toLocaleUpperCase('fr');
  topLine.appendChild(category);
  if (product.condition) {
    const condition = document.createElement('span');
    condition.className = `condition ${/hs|panne|defectueux|a reparer/i.test(product.condition) ? 'warning' : 'good'}`;
    condition.textContent = product.condition;
    topLine.appendChild(condition);
  }

  const title = document.createElement('h3');
  title.textContent = product.name;
  const description = document.createElement('p');
  description.className = 'specs';
  description.textContent = product.description;
  const bottom = document.createElement('div');
  bottom.className = 'product-bottom';
  const priceWrap = document.createElement('div');
  const price = document.createElement('strong');
  price.className = 'price';
  price.textContent = /\b(dt|tnd)\b/i.test(product.price) ? product.price : `${product.price} DT`;
  priceWrap.append(price);
  const negotiable = document.createElement('span');
  negotiable.className = 'negotiable';
  negotiable.textContent = 'Contactez-nous pour plus de détails';
  priceWrap.append(negotiable);

  const contact = document.createElement('a');
  contact.className = 'small-button';
  contact.href = MESSENGER_URL;
  contact.target = '_blank';
  contact.rel = 'noopener';
  contact.dataset.product = product.name;
  contact.dataset.price = price.textContent;
  contact.dataset.articleId = card.id;
  contact.setAttribute('aria-label', `Envoyer ${product.name} au prix de ${price.textContent} sur Messenger`);
  contact.textContent = 'Envoyer cet article';
  contact.addEventListener('click', prepareProductMessage);

  bottom.append(priceWrap, contact);
  content.append(topLine, title, description, bottom);
  card.appendChild(content);
  return card;
}

function normalizePhotoUrl(value) {
  if (typeof value === 'string' && value.startsWith('/')) {
    return { link: value, image: value, fallback: '' };
  }
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match) return null;

  try {
    const original = new URL(match[0].replace(/[),.;]+$/, ''));
    const driveId = original.hostname.endsWith('google.com')
      ? original.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || original.searchParams.get('id')
      : null;

    if (driveId && (original.hostname === 'drive.google.com' || original.hostname === 'docs.google.com')) {
      const id = encodeURIComponent(driveId);
      return {
        link: `https://drive.google.com/file/d/${id}/view`,
        image: `https://drive.google.com/uc?export=view&id=${id}`,
        fallback: `https://drive.google.com/thumbnail?id=${id}&sz=w1200`
      };
    }
    return { link: original.href, image: original.href, fallback: '' };
  } catch {
    return null;
  }
}

function slugify(value) {
  return value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'produit';
}

function prepareProductMessage(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const articleUrl = new URL(`#${button.dataset.articleId}`, window.location.href).href;
  const message = `Bonjour Gsinfo, je suis intéressé(e) par : ${button.dataset.product} — ${button.dataset.price}. ${articleUrl}`;
  window.open(button.href, '_blank', 'noopener,noreferrer');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(message).then(() => showProductMessageNotice('Détails copiés ! Collez-les dans votre conversation Messenger.'))
      .catch(() => window.prompt('Copiez les détails de l’article, puis collez-les dans Messenger :', message));
  } else {
    window.prompt('Copiez les détails de l’article, puis collez-les dans Messenger :', message);
  }
}

function showProductMessageNotice(text) {
  let notice = document.getElementById('product-message-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'product-message-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.style.cssText = 'position:fixed;left:50%;bottom:24px;z-index:1000;max-width:calc(100% - 32px);padding:14px 20px;transform:translateX(-50%);border:1px solid rgba(255,118,38,.65);border-radius:12px;background:#0b2021;color:#f5f4ef;box-shadow:0 12px 36px rgba(0,0,0,.4);font:600 14px/1.5 sans-serif;text-align:center;';
    document.body.appendChild(notice);
  }
  notice.textContent = text;
  notice.hidden = false;
  window.clearTimeout(showProductMessageNotice.timeout);
  showProductMessageNotice.timeout = window.setTimeout(() => { notice.hidden = true; }, 5000);
}
