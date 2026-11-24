# mon-site
Gsinfo site web

## Hébergement Cloudflare gratuit

Le dossier `public/` contient le site à publier, tandis que `functions/` fournit l’API.
Cloudflare Pages exécute ces fonctions et une base D1 gratuite contient les articles et
les photos compressées. Cela évite de souscrire au service R2. Chaque photo est réduite
à 1,65 Mo maximum côté navigateur pour respecter la limite D1 de 2 Mo par valeur.

Pour le déploiement, crée un projet **Pages > Connect to Git** depuis le dépôt
`Gsinfo2/mon-site`. Choisis la branche `main`, le préréglage `None`, aucune commande
de build et `public` comme dossier de sortie. Le catalogue temporaire reste affiché
jusqu’à la configuration de la base.

Crée ensuite une base D1 nommée `gsinfo-catalog`. Dans **Settings > Bindings** du
projet Pages, ajoute une liaison D1 appelée `DB` et sélectionne cette base. Dans la
console D1, exécute le contenu de `schema.sql`. Ajoute dans **Variables and Secrets**
les secrets `ADMIN_PASSWORD` (au moins 12 caractères) et `SESSION_SECRET` (au moins
32 caractères), puis relance un déploiement.

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
