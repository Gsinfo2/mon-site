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
      photo: column(['photo', 'image', 'photo url', 'url photo', 'url image', 'lien photo', 'lien de la photo', 'photo (url)', 'image url']),
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
      if (message) message.textContent = 'Aucun article disponible pour le moment. Revenez bientôt !';
      return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => fragment.appendChild(createProductCard(product)));
    productGrid.appendChild(fragment);
    if (message) message.textContent = columns.photo < 0
      ? 'Les articles sont chargés, mais la feuille ne contient pas de colonne Photo reconnue. Nommez cette colonne « Photo ».'
      : '';
  } catch (error) {
    console.error('Impossible de charger le catalogue Google Sheets :', error);
    productGrid.replaceChildren();
    if (message) message.textContent = 'Le catalogue n’a pas pu être chargé. Vérifiez que la feuille est publiée au format CSV et que les colonnes Nom et Prix sont présentes.';
  } finally {
    productGrid.setAttribute('aria-busy', 'false');
  }
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
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
    } else if (char === delimiter && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some((item) => item !== '')) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
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
      photoLink.textContent = 'Photo inaccessible — vérifiez le partage du fichier Drive';
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
  const raw = value.trim();
  if (!raw) return null;

  // Accept a plain URL or a URL pasted with surrounding text/quotes in the sheet.
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
