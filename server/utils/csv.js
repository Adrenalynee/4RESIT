const CSV_HEADERS = ['title', 'cookbook', 'prepTime', 'cookTime', 'servings', 'tags', 'source', 'favorite', 'ingredients', 'steps'];

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function serializeIngredients(ingredients) {
  return (ingredients || []).map((i) => `${i.quantity || ''}|${i.unit || ''}|${i.name || ''}`).join(';;');
}

function parseIngredients(raw) {
  if (!raw) return [];
  return raw.split(';;').filter(Boolean).map((chunk) => {
    const [quantity, unit, name] = chunk.split('|');
    return { quantity: quantity || '', unit: unit || '', name: name || '' };
  });
}

export function recipesToCsv(recipes, cookbooksById) {
  const rows = [CSV_HEADERS.join(',')];
  recipes.forEach((r) => {
    const cookbookName = r.cookbookId ? cookbooksById[r.cookbookId]?.name || '' : '';
    const row = [
      r.title,
      cookbookName,
      r.prepTime,
      r.cookTime,
      r.servings,
      (r.tags || []).join(';'),
      r.source || '',
      r.favorite ? 'true' : 'false',
      serializeIngredients(r.ingredients),
      (r.steps || []).join(';;'),
    ];
    rows.push(row.map(escapeCsvField).join(','));
  });
  return rows.join('\r\n');
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToImportPayload(text) {
  const rows = parseCsvRows(text.trim());
  if (rows.length === 0) return { cookbooks: [], recipes: [] };
  const [header, ...dataRows] = rows;
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const cookbooksByName = new Map();
  const recipes = [];

  dataRows.forEach((cols, i) => {
    if (cols.length === 1 && cols[0] === '') return;
    const cookbookName = (cols[idx.cookbook] || '').trim();
    let cookbookId = null;
    if (cookbookName) {
      if (!cookbooksByName.has(cookbookName)) {
        cookbooksByName.set(cookbookName, `csv-cb-${cookbooksByName.size}`);
      }
      cookbookId = cookbooksByName.get(cookbookName);
    }
    recipes.push({
      id: `csv-r-${i}`,
      title: cols[idx.title] || 'Recette sans titre',
      cookbookId,
      prepTime: Number(cols[idx.prepTime]) || 0,
      cookTime: Number(cols[idx.cookTime]) || 0,
      servings: Number(cols[idx.servings]) || 1,
      tags: (cols[idx.tags] || '').split(';').map((t) => t.trim()).filter(Boolean),
      source: cols[idx.source] || '',
      favorite: cols[idx.favorite] === 'true',
      ingredients: parseIngredients(cols[idx.ingredients]),
      steps: (cols[idx.steps] || '').split(';;').map((s) => s.trim()).filter(Boolean),
    });
  });

  const cookbooks = Array.from(cookbooksByName.entries()).map(([name, id]) => ({ id, name, description: '' }));
  return { cookbooks, recipes };
}
