document.getElementById('year').textContent = new Date().getFullYear();

function prepareProductMessage(event, button) {
  event.preventDefault();

  const product = button.dataset.product;
  const price = button.dataset.price;
  const productUrl = new URL('#produits', window.location.href).href;
  const message = `Bonjour Gsinfo, je suis intéressé(e) par : ${product} — ${price}. ${productUrl}`;

  // Open Messenger directly from the user's click, then copy the product details
  // so the customer can paste a clear item reference into the conversation.
  window.open(button.href, '_blank', 'noopener,noreferrer');

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(message).then(() => {
      showProductMessageNotice('Détails copiés ! Collez-les dans votre conversation Messenger.');
    }).catch(() => {
      window.prompt('Copiez les détails de l’article, puis collez-les dans Messenger :', message);
    });
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
