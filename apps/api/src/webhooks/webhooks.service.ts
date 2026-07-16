import { Injectable, Logger } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { InstancesService } from '../instances/instances.service';
import { MessagesService } from '../messages/messages.service';
import { MediaService } from '../media/media.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type EvoPayload = {
  event?: string;
  instance?: string;
  data?: any;
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private instances: InstancesService,
    private messages: MessagesService,
    private media: MediaService,
    private realtime: RealtimeGateway,
  ) {}

  async handleEvolution(body: unknown) {
    const payload = body as EvoPayload;
    const event = (payload.event || '').toLowerCase();
    const instanceName = payload.instance;
    if (!instanceName) return;

    const instance = await this.instances.findByEvolutionName(instanceName);
    if (!instance) {
      this.logger.warn(`Unknown instance webhook: ${instanceName}`);
      return;
    }

    if (event.includes('connection.update')) {
      const state = payload.data?.state || payload.data?.status;
      const status =
        state === 'open'
          ? 'CONNECTED'
          : state === 'connecting'
            ? 'CONNECTING'
            : 'DISCONNECTED';
      const phone =
        payload.data?.wuid?.split('@')[0] ||
        payload.data?.instance?.owner?.split('@')[0];
      await this.instances.updateStatus(instance.id, status, phone);
      this.realtime.emitToTenant(instance.tenantId, 'instance.updated', {
        id: instance.id,
        status,
        phoneNumber: phone,
      });
      return;
    }

    if (event.includes('qrcode.updated')) {
      this.realtime.emitToTenant(instance.tenantId, 'instance.qr', {
        id: instance.id,
        qrcode: payload.data?.qrcode?.base64 || payload.data?.base64,
      });
      return;
    }

    if (event.includes('messages.upsert')) {
      await this.handleMessagesUpsert(instance, payload.data);
    }
  }

  private async handleMessagesUpsert(
    instance: { id: string; tenantId: string },
    data: any,
  ) {
    const messages = Array.isArray(data) ? data : data?.messages || [data];
    for (const item of messages) {
      const key = item?.key || {};
      if (key.fromMe) continue;

      const remoteJid: string = key.remoteJid || '';
      if (!remoteJid || remoteJid.endsWith('@g.us')) continue;

      const phone = remoteJid.replace(/@.*/, '').replace(/\D/g, '');
      if (!phone) continue;

      const message = item.message || {};
      const pushName = item.pushName as string | undefined;
      const evolutionMessageId = key.id as string | undefined;

      const parsed = this.parseMessageContent(message);
      if (!parsed) continue;

      let mediaBuffer: Buffer | undefined;
      if (parsed.base64) {
        mediaBuffer = Buffer.from(
          parsed.base64.replace(/^data:[^;]+;base64,/, ''),
          'base64',
        );
      }

      await this.messages.ingestInbound({
        tenantId: instance.tenantId,
        instanceId: instance.id,
        phone,
        contactName: pushName,
        type: parsed.type,
        body: parsed.body,
        mediaBuffer,
        mediaMimeType: parsed.mimeType,
        mediaFileName: parsed.fileName,
        evolutionMessageId,
      });
    }
  }

  private parseMessageContent(message: Record<string, any>): {
    type: MessageType;
    body?: string;
    base64?: string;
    mimeType?: string;
    fileName?: string;
  } | null {
    if (message.conversation) {
      return { type: MessageType.TEXT, body: message.conversation };
    }
    if (message.extendedTextMessage?.text) {
      return {
        type: MessageType.TEXT,
        body: message.extendedTextMessage.text,
      };
    }
    if (message.imageMessage) {
      return {
        type: MessageType.IMAGE,
        body: message.imageMessage.caption,
        base64: message.base64 || message.imageMessage.base64,
        mimeType: message.imageMessage.mimetype || 'image/jpeg',
        fileName: 'image.jpg',
      };
    }
    if (message.audioMessage) {
      return {
        type: MessageType.AUDIO,
        base64: message.base64 || message.audioMessage.base64,
        mimeType: message.audioMessage.mimetype || 'audio/ogg',
        fileName: 'audio.ogg',
      };
    }
    if (message.videoMessage) {
      return {
        type: MessageType.VIDEO,
        body: message.videoMessage.caption,
        base64: message.base64 || message.videoMessage.base64,
        mimeType: message.videoMessage.mimetype || 'video/mp4',
        fileName: 'video.mp4',
      };
    }
    if (message.documentMessage) {
      return {
        type: MessageType.DOCUMENT,
        body: message.documentMessage.caption,
        base64: message.base64 || message.documentMessage.base64,
        mimeType:
          message.documentMessage.mimetype || 'application/octet-stream',
        fileName: message.documentMessage.fileName || 'document',
      };
    }
    if (message.stickerMessage) {
      return {
        type: MessageType.STICKER,
        base64: message.base64 || message.stickerMessage.base64,
        mimeType: message.stickerMessage.mimetype || 'image/webp',
        fileName: 'sticker.webp',
      };
    }
    return null;
  }
}
