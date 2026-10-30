import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface UploadOptions {
  employeeId: string;
  type: 'clockin' | 'clockout';
  buffer: Buffer;
  mimeType: string;
  timestamp?: Date;
}

export interface AttachmentUploadOptions {
  employeeId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export class StorageService {
  private static s3Client: S3Client | null = null;
  private static bucketName = process.env.AWS_S3_BUCKET || '';
  private static region = process.env.AWS_REGION || 'us-east-1';
  private static endpoint = process.env.AWS_ENDPOINT; // For Cloudflare R2 or MinIO
  private static publicDomain = process.env.AWS_PUBLIC_DOMAIN;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: this.endpoint || undefined,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
      });
    }
    return this.s3Client;
  }

  /**
   * Generates sanitized key path:
   * attendances/{employeeId}/{year}/{month}/{date}_{type}.webp
   */
  public static generateStorageKey(employeeId: string, type: 'clockin' | 'clockout', date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const timestamp = Date.now();

    return `attendances/${employeeId}/${year}/${month}/${year}-${month}-${day}_${type}_${timestamp}.webp`;
  }

  /**
   * Uploads selfie photo either to S3/R2 or local disk storage fallback
   */
  public static async uploadSelfie(options: UploadOptions): Promise<string> {
    const date = options.timestamp || new Date();
    const storageKey = this.generateStorageKey(options.employeeId, options.type, date);

    // If S3 bucket and credentials exist, upload to S3 / Cloudflare R2
    if (this.bucketName && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const client = this.getS3Client();
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: options.buffer,
          ContentType: options.mimeType || 'image/webp',
        });

        await client.send(command);

        if (this.publicDomain) {
          return `${this.publicDomain.replace(/\/$/, '')}/${storageKey}`;
        }

        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;
      } catch (err) {
        console.warn('⚠️ S3 upload failed, falling back to local storage:', err);
      }
    }

    // Zero-config local disk storage fallback
    const localBasePath = path.join(process.cwd(), 'uploads');
    const targetFilePath = path.join(localBasePath, storageKey);
    const targetDir = path.dirname(targetFilePath);

    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(targetFilePath, options.buffer);

    // Return relative URL served by Express static
    return `/uploads/${storageKey.replace(/\\/g, '/')}`;
  }

  /**
   * Uploads leave request attachment (doctor's note, permit letter, etc.)
   */
  public static async uploadAttachment(options: AttachmentUploadOptions): Promise<string> {
    const timestamp = Date.now();
    const sanitizedExt = path.extname(options.originalName) || '.jpg';
    const cleanBaseName = path
      .basename(options.originalName, sanitizedExt)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `attachments/${options.employeeId}/${timestamp}_${cleanBaseName}${sanitizedExt}`;

    if (this.bucketName && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const client = this.getS3Client();
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: options.buffer,
          ContentType: options.mimeType || 'application/octet-stream',
        });

        await client.send(command);

        if (this.publicDomain) {
          return `${this.publicDomain.replace(/\/$/, '')}/${storageKey}`;
        }

        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;
      } catch (err) {
        console.warn('⚠️ S3 attachment upload failed, falling back to local storage:', err);
      }
    }

    const localBasePath = path.join(process.cwd(), 'uploads');
    const targetFilePath = path.join(localBasePath, storageKey);
    const targetDir = path.dirname(targetFilePath);

    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(targetFilePath, options.buffer);

    return `/uploads/${storageKey.replace(/\\/g, '/')}`;
  }

  /**
   * Uploads sales canvasing visit photo
   */
  public static async uploadVisitPhoto(options: {
    employeeId: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<string> {
    const timestamp = Date.now();
    const storageKey = `visits/${options.employeeId}/${timestamp}_visit.jpg`;

    if (this.bucketName && process.env.AWS_ACCESS_KEY_ID) {
      try {
        const client = this.getS3Client();
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: options.buffer,
          ContentType: options.mimeType || 'image/jpeg',
        });

        await client.send(command);

        if (this.publicDomain) {
          return `${this.publicDomain.replace(/\/$/, '')}/${storageKey}`;
        }
        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;
      } catch (err) {
        console.warn('⚠️ S3 visit photo upload failed, falling back to local storage:', err);
      }
    }

    const localBasePath = path.join(process.cwd(), 'uploads');
    const targetFilePath = path.join(localBasePath, storageKey);
    const targetDir = path.dirname(targetFilePath);

    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(targetFilePath, options.buffer);

    return `/uploads/${storageKey.replace(/\\/g, '/')}`;
  }
}
