# mon-site
Gsinfo site web

## Hébergement Cloudflare gratuit

Le dossier `public/` contient le site à publier, tandis que `functions/` fournit l’API.
Cloudflare Pages exécute ces fonctions et utilise une base D1 pour le catalogue ainsi
qu’un stockage R2 pour les photos. Le projet utilise le plan gratuit dans les limites
des quotas Cloudflare.

Le projet n’est pas encore prêt à être déployé : il faut d’abord créer les ressources
Cloudflare et remplacer l’ID provisoire de la base D1 dans `wrangler.jsonc`.
Les liaisons attendues sont D1 `DB` et R2 `PHOTOS`. Configure aussi les secrets
`ADMIN_PASSWORD` (au moins 12 caractères) et `SESSION_SECRET` (au moins 32 caractères).
La base doit recevoir le schéma de `schema.sql`.

L’adresse temporaire `*.pages.dev` permet de vérifier le site avant d’acheter un domaine.
Pour le domaine `.tn`, le bureau d’enregistrement doit permettre de changer les serveurs DNS.

## Démarrage local avec Flask

```powershell
py -m pip install -r requirements.txt
$env:GSINFO_ADMIN_PASSWORD="Choisissez-un-mot-de-passe"
py app.py
```

Ouvre http://127.0.0.1:5000/. L’icône en forme d’engrenage ouvre l’espace privé local.

Sans `GSINFO_ADMIN_PASSWORD`, l’application affiche un mot de passe unique dans le terminal au premier démarrage.
Les articles sont enregistrés dans `data/catalog.db`; les nouvelles photos sont enregistrées dans `data/uploads/`.
