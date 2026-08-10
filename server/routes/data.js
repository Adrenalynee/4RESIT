import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { gatherExportData, applyImport } from '../utils/importExport.js';
import { recipesToCsv, csvToImportPayload } from '../utils/csv.js';

export const exportRouter = Router();
exportRouter.get('/', requireAuth, async (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const data = await gatherExportData(req.userId);

  if (format === 'csv') {
    const cookbooksById = Object.fromEntries(data.cookbooks.map((cb) => [cb.id, cb]));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="supmeal-export.csv"');
    return res.send(recipesToCsv(data.recipes, cookbooksById));
  }

  res.set('Content-Disposition', 'attachment; filename="supmeal-export.json"');
  res.json(data);
});

export const importRouter = Router();
importRouter.post('/', requireAuth, async (req, res) => {
  const { format, content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'Contenu du fichier requis' });

  let payload;
  try {
    payload = format === 'csv' ? csvToImportPayload(content) : JSON.parse(content);
  } catch {
    return res.status(400).json({ error: "Le fichier n'est pas un export SUPMEAL valide (JSON ou CSV)" });
  }

  const result = await applyImport(req.userId, payload);
  res.status(201).json({ success: true, ...result });
});
