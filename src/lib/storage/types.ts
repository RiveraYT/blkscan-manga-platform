export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface IStorageService {
  upload(fileBuffer: Buffer | Uint8Array, key: string, contentType: string): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
  getUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}
