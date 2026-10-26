import fs from 'node:fs/promises';
import path from 'node:path';
import type { IStorageService, UploadResult } from './types';

export class LocalStorageService implements IStorageService {
  private baseDir: string;
  private publicPrefix: string;

  constructor(baseDir = 'public/uploads', publicPrefix = '/uploads') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    this.publicPrefix = publicPrefix;
  }

  private async ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async upload(fileBuffer: Buffer | Uint8Array, key: string, contentType: string): Promise<UploadResult> {
    const cleanKey = key.replace(/^\/+/, '');
    const fullPath = path.join(this.baseDir, cleanKey);
    await this.ensureDir(fullPath);
    await fs.writeFile(fullPath, fileBuffer);

    return {
      key: cleanKey,
      url: `${this.publicPrefix}/${cleanKey.replace(/\\/g, '/')}`,
      size: fileBuffer.byteLength,
      contentType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const fullPath = path.join(this.baseDir, cleanKey);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicPrefix}/${cleanKey.replace(/\\/g, '/')}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const fullPath = path.join(this.baseDir, cleanKey);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
