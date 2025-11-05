import * as path from 'path';
import * as fs from 'fs';

export class LocalStorageService {
  private readonly uploadDir: string;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public getPublicUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  public getUploadPath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}
