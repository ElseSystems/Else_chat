import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class MediaService {
  private uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveUpload(file: Express.Multer.File) {
    return this.saveBuffer(file.buffer, file.mimetype, file.originalname);
  }

  async saveBuffer(buffer: Buffer, mimeType: string, originalName: string) {
    const ext = extname(originalName) || this.extFromMime(mimeType);
    const filename = `${randomUUID()}${ext}`;
    const fullPath = join(this.uploadDir, filename);
    await pipeline(Readable.from(buffer), createWriteStream(fullPath));
    return {
      filename,
      fullPath,
      urlPath: `/uploads/${filename}`,
      mimeType,
    };
  }

  async saveBase64(base64: string, mimeType: string, originalName: string) {
    const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleaned, 'base64');
    return this.saveBuffer(buffer, mimeType, originalName);
  }

  mapMimeToType(mime: string): MessageType {
    if (mime.startsWith('image/')) return MessageType.IMAGE;
    if (mime.startsWith('audio/')) return MessageType.AUDIO;
    if (mime.startsWith('video/')) return MessageType.VIDEO;
    return MessageType.DOCUMENT;
  }

  mapTypeToEvolution(
    type: MessageType,
  ): 'image' | 'video' | 'document' | 'audio' {
    switch (type) {
      case MessageType.IMAGE:
      case MessageType.STICKER:
        return 'image';
      case MessageType.VIDEO:
        return 'video';
      case MessageType.AUDIO:
        return 'audio';
      default:
        return 'document';
    }
  }

  private extFromMime(mime: string) {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'video/mp4': '.mp4',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }
}
