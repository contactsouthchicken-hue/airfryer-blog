# Guide Air Fryer — blog d'affiliation avec publication quotidienne automatique

Site Astro (statique, rapide, SEO-friendly) qui publie **automatiquement chaque jour** un
nouveau guide de ~2500 mots sur les friteuses à air chaud (comparatif, guide complet, avis ou
astuces), avec des liens Amazon affiliés insérés automatiquement. La génération de contenu
utilise l'API Claude ; la publication est déclenchée par un cron GitHub Actions.

## Comment ça marche

1. Chaque jour, GitHub Actions exécute `scripts/generate-article.mjs`.
2. Le script choisit une catégorie (rotation stricte comparatifs → guides-complets → avis →
   astuces) et un angle pas encore traité récemment (`scripts/topics.json` + historique dans
   `scripts/state/used-topics.json`).
3. Il appelle l'API Claude avec un prompt structuré (system prompt + liste de tes produits
   Amazon) et récupère un article complet + métadonnées SEO via un appel d'outil structuré.
4. Il remplace les tokens `[PRODUIT:cle]` / `[COMPARATIF:cle1|cle2]` écrits par le modèle par
   de vrais composants `<ProductCard />` / `<ComparisonTable />` qui pointent vers tes liens
   Amazon affiliés (`src/lib/amazon.ts`).
5. Il écrit le fichier dans `src/content/guides/AAAA-MM-JJ-titre.mdx`, vérifie que le site
   compile (`npm run build`), puis commit + push. Si tu as connecté Vercel/Netlify au dépôt,
   le déploiement se déclenche automatiquement à chaque push.

## Mise en route

### 1. Installer et prévisualiser en local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:4321`. Trois articles d'exemple (écrits à la main) sont déjà présents
dans `src/content/guides/` pour que tu puisses voir le rendu (comparatif, guide complet, avis)
sans avoir besoin d'une clé API.

### 2. Personnaliser le site

- `src/data/site.ts` : nom du site, description, tagline, domaine (`url`), tag Amazon.
- `astro.config.mjs` : la constante `SITE_URL` doit être **identique** à `site.ts` → `url`.
- `public/robots.txt` : mets à jour l'URL du sitemap avec ton vrai domaine.
- `public/favicon.svg` : remplace par ton propre logo si besoin.
- Pages légales à compléter avant mise en ligne réelle : `src/pages/mentions-legales.astro`,
  `src/pages/confidentialite.astro`, `src/pages/a-propos.astro` (contiennent des `[à
  compléter]` explicites). Ce sont des gabarits, pas des textes juridiques validés.

### 3. Créer ton compte Amazon Associates

Tu n'as pas encore de compte : rends-toi sur
[affiliate-program.amazon.com](https://affiliate-program.amazon.com) et inscris-toi. Points
importants :

- Amazon demande une **URL de site déjà en ligne avec du contenu** au moment de la demande —
  déploie donc le site (étape 5) avant de faire la demande.
- Le compte est en période d'essai 180 jours : il faut réaliser **au moins 3 ventes
  qualifiées** durant cette période, sinon le compte est fermé et il faut redemander.
- Une fois approuvé, récupère ton **tracking ID** (ex. `monsite-21`) et renseigne-le dans
  `src/data/site.ts` → `AMAZON_TRACKING_ID`.

### 4. Renseigner tes produits

`src/data/products.json` contient un catalogue d'exemple avec des ASIN placeholder
(`ASIN_A_REMPLACER_...`). Pour chaque produit que tu veux promouvoir :

1. Va sur la fiche produit Amazon, récupère son **ASIN** (dans l'URL ou dans "Informations
   sur le produit").
2. Remplace la valeur `asin` correspondante dans `products.json`.
3. Ajoute une vraie image produit dans `public/images/products/` et mets à jour le champ
   `image`.
4. Tu peux ajouter d'autres produits en suivant le même format (`key`, `name`, `asin`,
   `image`, `category`, `pitch`, `pros`, `cons`) — le script de génération les découvre
   automatiquement.

**Important (règles Amazon Associates) :** n'affiche jamais de prix figé en dur dans le
contenu ou le JSON — les prix Amazon changent en permanence et les afficher de façon statique
viole les conditions du programme. Le composant `ProductCard` renvoie donc toujours vers
Amazon pour le prix ("Voir le prix sur Amazon") plutôt que de l'afficher lui-même.

### 5. Mettre le projet sur GitHub et le déployer

```bash
git init
git add .
git commit -m "Initial commit"
```

Crée un dépôt sur GitHub puis :

```bash
git remote add origin <URL_DE_TON_DEPOT>
git push -u origin main
```

Connecte ensuite le dépôt à **Vercel** ou **Netlify** (les deux ont un tier gratuit largement
suffisant pour un blog) :

- Vercel : "Add New Project" → importe le dépôt GitHub → framework détecté automatiquement
  (Astro) → Deploy.
- Netlify : "Add new site" → "Import an existing project" → connecte GitHub → build command
  `npm run build`, publish directory `dist`.

Chaque push sur `main` (donc chaque article généré automatiquement) redéploiera le site.

### 6. Activer la génération automatique quotidienne

Dans les paramètres du dépôt GitHub : **Settings → Secrets and variables → Actions → New
repository secret**, ajoute :

- `ANTHROPIC_API_KEY` : ta clé API Anthropic (console.anthropic.com → API Keys). Il te faut du
  crédit sur le compte pour que les appels API fonctionnent.

Le workflow `.github/workflows/daily-article.yml` tourne ensuite tous les jours à 6h UTC. Tu
peux aussi le déclencher manuellement depuis l'onglet **Actions** du dépôt GitHub (bouton "Run
workflow") pour tester sans attendre le lendemain.

### 7. Tester la génération en local (optionnel)

```bash
cp .env.example .env
# renseigne ANTHROPIC_API_KEY dans .env
npm run generate
```

Un nouvel article apparaît dans `src/content/guides/`. Vérifie-le avec `npm run dev`, puis
supprime-le si ce n'était qu'un test (et retire l'entrée correspondante ajoutée dans
`scripts/state/used-topics.json`).

## Étendre le système dans le temps

- **Plus de variété de sujets** : ajoute des entrées dans `scripts/topics.json` (par
  catégorie) au fil du temps pour éviter que les angles ne finissent par se répéter.
- **Plus de produits** : ajoute des entrées dans `src/data/products.json` ; le script les
  proposera automatiquement au modèle pour insertion dans les nouveaux articles.
- **Changer le rythme de publication** : modifie l'expression cron dans
  `.github/workflows/daily-article.yml` (actuellement `0 6 * * *`, tous les jours à 6h UTC).
- **Changer le modèle utilisé pour la génération** : `scripts/generate-article.mjs`, variable
  `model` dans l'appel à `client.messages.create`.

## Structure du projet

```
src/
  content/guides/       → les articles (Markdown/MDX), générés ou écrits à la main
  content.config.ts     → schéma des articles (frontmatter validé)
  components/           → ProductCard, ComparisonTable, AffiliateDisclosure, SEOHead...
  layouts/               → BaseLayout, GuideLayout
  pages/                 → routes du site (accueil, catégories, article, pages légales)
  data/                  → site.ts (config), products.json (catalogue Amazon)
  lib/amazon.ts          → génération des liens d'affiliation
scripts/
  generate-article.mjs   → script principal de génération quotidienne
  topics.json            → banque de sujets par catégorie
  state/used-topics.json → historique des sujets déjà traités
.github/workflows/
  daily-article.yml      → automatisation GitHub Actions
```

## Commandes disponibles

| Commande            | Action                                                |
| :------------------ | :----------------------------------------------------- |
| `npm install`        | Installe les dépendances                               |
| `npm run dev`         | Lance le serveur de dev sur `localhost:4321`            |
| `npm run build`       | Build de production dans `./dist/`                      |
| `npm run preview`     | Prévisualise le build de production en local            |
| `npm run generate`    | Génère manuellement l'article du jour (nécessite une clé API) |
