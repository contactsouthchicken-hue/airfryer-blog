import { AMAZON_DOMAIN, AMAZON_TRACKING_ID } from '../data/site';
import productsData from '../data/products.json';

export type Product = {
  key: string;
  name: string;
  asin: string;
  image: string;
  category: string;
  pitch: string;
  pros: string[];
  cons: string[];
};

const products: Product[] = productsData.products;

export function getProduct(key: string): Product | undefined {
  return products.find((p) => p.key === key);
}

export function getAllProducts(): Product[] {
  return products;
}

/** Construit une URL d'affiliation Amazon à partir d'un ASIN. */
export function buildAmazonLink(asin: string): string {
  const base = `https://www.${AMAZON_DOMAIN}/dp/${asin}`;
  return AMAZON_TRACKING_ID ? `${base}?tag=${AMAZON_TRACKING_ID}` : base;
}
