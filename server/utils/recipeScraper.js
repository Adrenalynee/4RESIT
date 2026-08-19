import * as cheerio from 'cheerio';

const ALLOWED_HOSTS = ['marmiton.org', 'cuisineaz.com'];
const FETCH_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function isAllowedRecipeUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && isAllowedHost(url.hostname);
}

function parseIsoDurationToMinutes(duration) {
  if (!duration) return null;
  const match = /^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(duration);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours * 60 + minutes || null;
}

function parseServings(recipeYield) {
  const value = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  const match = /\d+/.exec(String(value ?? ''));
  return match ? Number(match[0]) : null;
}

function flattenInstructions(instructions) {
  if (!instructions) return [];
  const list = Array.isArray(instructions) ? instructions : [instructions];
  const steps = [];
  for (const item of list) {
    if (typeof item === 'string') steps.push(item.trim());
    else if (item?.itemListElement) steps.push(...flattenInstructions(item.itemListElement));
    else if (item?.text) steps.push(String(item.text).trim());
  }
  return steps.filter(Boolean);
}

const UNIT_WORDS = [
  'cuillères à soupe', 'cuillère à soupe', 'cuillères à café', 'cuillère à café',
  'c. à soupe', 'c à soupe', 'c. à café', 'c à café', 'càs', 'càc',
  'sachet(s)', 'sachets', 'sachet',
  'pincée(s)', 'pincées', 'pincée',
  'gousse(s)', 'gousses', 'gousse',
  'tranche(s)', 'tranches', 'tranche',
  'portion(s)', 'portions', 'portion',
  'tasse(s)', 'tasses', 'tasse',
  'verre(s)', 'verres', 'verre',
  'pot(s)', 'pots', 'pot',
  'boîte(s)', 'boîtes', 'boîte',
  'botte(s)', 'bottes', 'botte',
  'branche(s)', 'branches', 'branche',
  'feuille(s)', 'feuilles', 'feuille',
  'brin(s)', 'brins', 'brin',
  'filet(s)', 'filets', 'filet',
  'noix',
  'kilogrammes', 'kilogramme', 'kg',
  'milligrammes', 'milligramme', 'mg',
  'grammes', 'gramme', 'g',
  'litres', 'litre', 'l',
  'centilitres', 'centilitre', 'cl',
  'millilitres', 'millilitre', 'ml',
  'pièce(s)', 'pièces', 'pièce',
  'unité(s)', 'unités', 'unité',
].sort((a, b) => b.length - a.length);

function splitIngredientLine(rawLine) {
  const line = String(rawLine).trim();
  const qtyMatch = /^(\d+(?:[.,]\d+)?)\s+(.*)$/.exec(line);
  if (!qtyMatch) return { name: line, quantity: '', unit: '' };

  const quantity = qtyMatch[1];
  let rest = qtyMatch[2];
  const lowerRest = rest.toLowerCase();
  const unitWord = UNIT_WORDS.find((u) => lowerRest.startsWith(u.toLowerCase()));

  let unit = '';
  if (unitWord) {
    unit = rest.slice(0, unitWord.length);
    rest = rest.slice(unitWord.length).replace(/^\s+(de |d'|du |des )?/i, '');
  }

  return { name: rest.trim() || line, quantity, unit };
}

function firstImageUrl(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return firstImageUrl(image[0]);
  if (image.url) return image.url;
  return null;
}

function findRecipeNode(jsonLd) {
  const nodes = Array.isArray(jsonLd) ? jsonLd : jsonLd['@graph'] || [jsonLd];
  return nodes.find((node) => {
    const type = node?.['@type'];
    return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
  });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function scrapeRecipeFromUrl(rawUrl) {
  if (!isAllowedRecipeUrl(rawUrl)) {
    throw httpError(400, 'Seuls les liens Marmiton et CuisineAZ sont acceptés');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SupmealRecipeImporter/1.0)' },
    });
  } catch {
    throw httpError(502, 'Impossible de récupérer la page (délai dépassé ou site injoignable)');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw httpError(502, "Impossible de récupérer la page (erreur HTTP)");
  if (!isAllowedRecipeUrl(response.url)) {
    throw httpError(400, 'Seuls les liens Marmiton et CuisineAZ sont acceptés');
  }
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_CONTENT_LENGTH) throw httpError(502, 'La page est trop volumineuse');

  const html = await response.text();
  const $ = cheerio.load(html);

  let recipeNode = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipeNode) return;
    try {
      const found = findRecipeNode(JSON.parse($(el).contents().text()));
      if (found) recipeNode = found;
    } catch {
      // bloc JSON-LD invalide, on l'ignore
    }
  });

  if (!recipeNode) throw httpError(422, "Aucune recette n'a été trouvée sur cette page");

  return {
    title: String(recipeNode.name || '').trim(),
    image: firstImageUrl(recipeNode.image),
    prepTime: parseIsoDurationToMinutes(recipeNode.prepTime),
    cookTime: parseIsoDurationToMinutes(recipeNode.cookTime),
    servings: parseServings(recipeNode.recipeYield),
    ingredients: (recipeNode.recipeIngredient || []).map(splitIngredientLine),
    steps: flattenInstructions(recipeNode.recipeInstructions),
    source: rawUrl,
  };
}
