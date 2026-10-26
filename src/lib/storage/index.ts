import type { IStorageService } from './types';
import { LocalStorageService } from './local';
import { S3StorageService } from './s3';

let storageInstance: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (storageInstance) return storageInstance;

  const type = process.env.STORAGE_TYPE || 'local';
  const hasS3Config =
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY;

  if (type === 's3' && hasS3Config) {
    try {
      storageInstance = new S3StorageService();
      return storageInstance;
    } catch (e) {
      console.warn('⚠️ Fallo al inicializar S3, usando almacenamiento local de fallback:', e);
    }
  }

  // Fallback seguro a almacenamiento local
  storageInstance = new LocalStorageService();
  return storageInstance;
}

export const storage = getStorageService();
export * from './types';
