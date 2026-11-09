const CATALOG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTSSFhM7HdoC95mzcZyNrllOkGSjQ99RRhxPkH-MlsxlceUzqkupuPR-8T3-F8OCH5rSsSUW2GYJ5YQ/pub?gid=0&single=true&output=csv';
const MESSENGER_URL = 'https://m.me/gsinfo233';

const yearElement = document.getElementById('year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

const productGrid = document.getElementById('product-grid');
if (productGrid) loadCatalog();

async function loadCatalog() {
  const message = document.getElementById('catalog-message');
  try {
    const response = await fetch(CATALOG_CSV_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Réponse HTTP ${response.status}`);
    const csv = (await response.text()).replace(/^\uFEFF/, '');
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error('La feuille ne contient encore aucun article.');

    const headers = rows[0].map(normalizeHeader);
    const column = (names) => headers.findIndex((header) => names.includes(header));
    const columns = {
      name: column(['nom', 'article', 'produit', 'name']),
      category: column(['categorie', 'category', 'type']),
      price: column(['prix', 'price']),
      condition: column(['etat', 'condition', 'statut']),
      description: column(['description', 'details', 'specifications']),
      photo: column(['photo', 'image', 'photo url', 'lien photo']),
      available: column(['disponible', 'disponibilite', 'available', 'en vente'])
    };
    if (columns.name < 0 || columns.price < 0) {
      throw new Error('Vérifiez les colonnes Nom et Prix dans la première ligne de votre feuille.');
    }

    const products = rows.slice(1).map((row, index) => ({
      name: cell(row, columns.name),
      category: cell(row, columns.category) || 'ARTICLE',
      price: cell(row, columns.price),
      condition: cell(row, columns.condition),
      description: cell(row, columns.description),
      photo: cell(row, columns.photo),
      available: cell(row, columns.available),
      index
    })).filter((product) => product.name && product.price && isAvailable(product.available));

    productGrid.replaceChildren();
    if (!products.length) {
      message.textContent = 'Aucun article disponible pour le moment. Revenez bientôt !';
      return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => fragment.appendChild(createProductCard(product)));
    productGrid.appendChild(fragment);
    message.textContent = '';
  } catch (error) {
    console.error('Impossible de charger le catalogue Google Sheets :', error);
    productGrid.replaceChildren();
    message.textContent = 'Le catalogue n’a pas pu être chargé. Vérifiez que la feuille est publiée sur le Web au format CSV et que les colonnes Nom et Prix sont présentes.';
  } finally {
    productGrid.setAttribute('aria-busy', 'false');
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some((cellValue) => cellValue !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some((cellValue) => cellValue !== '')) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function cell(row, index) {
  return index < 0 ? '' : (row[index] || '').trim();
}

function isAvailable(value) {
  const normalized = normalizeHeader(value);
  return !['non', 'non disponible', 'vendu', 'indisponible', 'no', 'false'].includes(normalized);
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  const slug = `${slugify(product.name)}-${product.index + 1}`;
  card.id = `article-${slug}`;

  const photoUrl = normalizePhotoUrl(product.photo);
  if (photoUrl) {
    const photoLink = document.createElement('a');
    photoLink.className = 'product-photo';
    photoLink.href = photoUrl;
    photoLink.target = '_blank';
    photoLink.rel = 'noopener noreferrer';
    const image = document.createElement('img');
    image.src = photoUrl;
    image.alt = product.name;
    image.loading = 'lazy';
    image.onerror = () => { photoLink.remove(); };
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
  priceWrap.appendChild(price);
  const negotiable = document.createElement('span');
  negotiable.className = 'negotiable';
  negotiable.textContent = 'Contactez-nous pour plus de détails';
  priceWrap.appendChild(negotiable);

  const contact = document.createElement('a');
  contact.className = 'small-button';
  contact.href = MESSENGER_URL;
  contact.target = '_blank';
  contact.rel = 'noopener';
  contact.dataset.product = product.name;
  contact.dataset.price = price.textContent;
  contact.dataset.articleId = card.id;
  contact.setAttribute('aria-label', `Envoyer ${product.name} au prix de ${price.textContent} sur Messenger`);
  contact.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><span>Envoyer cet article</span>';
  contact.addEventListener('click', prepareProductMessage);

  bottom.append(priceWrap, contact);
  content.append(topLine, title, description, bottom);
  card.appendChild(content);
  return card;
}

function normalizePhotoUrl(value) {
  const raw = value.trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.hostname === 'drive.google.com') {
      const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
      if (fileId) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    }
    return url.href;
  } catch {
    return '';
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

  // Open Messenger synchronously from the click; copy the precise item details for the customer to paste.
  window.open(button.href, '_blank', 'noopener,noreferrer');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(message).then(() => {
      showProductMessageNotice('Détails copiés ! Collez-les dans votre conversation Messenger.');
    }).catch(() => window.prompt('Copiez les détails de l’article, puis collez-les dans Messenger :', message));
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
    notice.style.cssText = 'position:fixed;left:50%;bottom:24px;z-index:1000;max-width:calc(100% - 32px);padding:14px 20px;transform:translateX(-50%);border:1px solid rgba(215,181,116,.55);border-radius:12px;background:#171411;color:#f7f3eb;box-shadow:0 12px 36px rgba(0,0,0,.4);font:600 14px/1.5 sans-serif;text-align:center;';
    document.body.appendChild(notice);
  }
  notice.textContent = text;
  notice.hidden = false;
  window.clearTimeout(showProductMessageNotice.timeout);
  showProductMessageNotice.timeout = window.setTimeout(() => { notice.hidden = true; }, 5000);
}
