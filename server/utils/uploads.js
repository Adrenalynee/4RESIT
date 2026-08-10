import { unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.resolve('uploads');

export async function deleteUploadedFile(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = path.basename(url);
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // fichier déjà absent ou jamais stocké localement (ex: avatar pravatar.cc) - rien à faire
  }
}
