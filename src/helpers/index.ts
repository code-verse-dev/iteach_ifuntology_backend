import * as fs from 'fs';
import * as path from 'path';

export function removeFromUploads(filename?: string) {
  if (!filename) return;
  const filePath = path.resolve('Uploads', filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    console.error(`Failed to delete file ${filename}:`, err.message);
  }
}
