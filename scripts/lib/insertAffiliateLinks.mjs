const PRODUCT_TOKEN = /\[PRODUIT:([a-zA-Z0-9-]+)\]/g;
const COMPARISON_TOKEN = /\[COMPARATIF:([a-zA-Z0-9|-]+)\]/g;

/**
 * Remplace les tokens [PRODUIT:key] et [COMPARATIF:a|b|c] écrits par le modèle
 * par de vrais composants Astro (<ProductCard />, <ComparisonTable />), en ne
 * gardant que les clés produits qui existent réellement dans products.json.
 * Retourne le corps transformé + la liste des imports de composants nécessaires.
 */
export function insertAffiliateLinks(body, validProductKeys) {
  const validKeys = new Set(validProductKeys);
  let usesProductCard = false;
  let usesComparisonTable = false;

  let output = body.replace(PRODUCT_TOKEN, (match, key) => {
    if (!validKeys.has(key)) return '';
    usesProductCard = true;
    return `<ProductCard productKey="${key}" />`;
  });

  output = output.replace(COMPARISON_TOKEN, (match, keysRaw) => {
    const keys = keysRaw.split('|').filter((k) => validKeys.has(k));
    if (keys.length < 2) return '';
    usesComparisonTable = true;
    const arr = keys.map((k) => `"${k}"`).join(', ');
    return `<ComparisonTable productKeys={[${arr}]} />`;
  });

  const imports = [];
  if (usesProductCard) imports.push("import ProductCard from '../../components/ProductCard.astro';");
  if (usesComparisonTable) imports.push("import ComparisonTable from '../../components/ComparisonTable.astro';");

  return { body: output, imports };
}
