import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { IStorageService, UploadResult } from './types';

export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;
  private publicDomain: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'auto';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
    this.bucket = process.env.S3_BUCKET_NAME || '';
    this.publicDomain = (process.env.S3_PUBLIC_DOMAIN || '').replace(/\/$/, '');

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: !process.env.S3_ENDPOINT?.includes('amazonaws.com'),
    });
  }

  async upload(fileBuffer: Buffer | Uint8Array, key: string, contentType: string): Promise<UploadResult> {
    const cleanKey = key.replace(/^\/+/, '');
    
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    const url = this.getUrl(cleanKey);

    return {
      key: cleanKey,
      url,
      size: fileBuffer.byteLength,
      contentType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      return true;
    } catch (error) {
      console.error('Error eliminando de S3:', error);
      return false;
    }
  }

  getUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.publicDomain) {
      return `${this.publicDomain}/${cleanKey}`;
    }
    // Fallback estándar S3 / R2
    const endpoint = process.env.S3_ENDPOINT;
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${cleanKey}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${cleanKey}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
