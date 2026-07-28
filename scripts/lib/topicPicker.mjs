import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOPICS_PATH = path.join(__dirname, '..', 'topics.json');
const USED_TOPICS_PATH = path.join(__dirname, '..', 'state', 'used-topics.json');

const CATEGORY_ROTATION = ['comparatifs', 'guides-complets', 'avis', 'astuces'];

function dayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

export function loadUsedTopics() {
  try {
    return JSON.parse(readFileSync(USED_TOPICS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function saveUsedTopic(entry) {
  const used = loadUsedTopics();
  used.push(entry);
  writeFileSync(USED_TOPICS_PATH, JSON.stringify(used, null, 2) + '\n');
}

/**
 * Choisit la catégorie du jour (rotation stricte comparatifs -> guides-complets ->
 * avis -> astuces) et un "seed" (angle) pas encore traité récemment dans cette
 * catégorie. Si tous les seeds ont été utilisés, on reprend le moins récent.
 */
export function pickTodaysTopic(date = new Date()) {
  const topics = JSON.parse(readFileSync(TOPICS_PATH, 'utf8'));
  const used = loadUsedTopics();

  const category = CATEGORY_ROTATION[dayOfYear(date) % CATEGORY_ROTATION.length];
  const seeds = topics[category].seeds;

  const usedForCategory = used.filter((u) => u.category === category);
  const usedSeeds = new Set(usedForCategory.map((u) => u.seed));

  let seed = seeds.find((s) => !usedSeeds.has(s));

  if (!seed) {
    // Tous les seeds ont déjà été traités : on reprend le moins récemment utilisé.
    const lastUsedAt = new Map();
    usedForCategory.forEach((u) => lastUsedAt.set(u.seed, u.date));
    seed = [...seeds].sort((a, b) => (lastUsedAt.get(a) ?? '').localeCompare(lastUsedAt.get(b) ?? ''))[0];
  }

  const recentTitles = used
    .slice(-15)
    .map((u) => u.title)
    .filter(Boolean);

  return { category, seed, recentTitles };
}
