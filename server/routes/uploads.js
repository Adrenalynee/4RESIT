import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const UPLOAD_DIR = path.resolve('uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

// Whitelist stricte par type MIME déclaré : l'extension du fichier stocké est dérivée de cette
// table, jamais du nom de fichier envoyé par le client. SVG exclu volontairement (peut contenir
// du JS exécuté si le fichier est ouvert directement -> XSS stockée).
const ALLOWED_MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${randomUUID()}${ALLOWED_MIME_TO_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) return cb(new Error('Format d\'image non autorisé (png, jpeg, webp ou gif uniquement)'));
    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop volumineuse (max 5 Mo)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
