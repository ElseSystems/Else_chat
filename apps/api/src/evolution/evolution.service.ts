import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get('EVOLUTION_API_URL') || 'http://localhost:8080').replace(
      /\/$/,
      '',
    );
    this.apiKey = config.get('EVOLUTION_API_KEY') || 'elsechat-evolution-key';
    this.webhookUrl =
      config.get('EVOLUTION_WEBHOOK_URL') ||
      'http://host.docker.internal:3001/webhooks/evolution';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        apikey: this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
      validateStatus: () => true,
    });
  }

  async createInstance(instanceName: string) {
    const res = await this.client.post('/instance/create', {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    });
    if (res.status >= 400) {
      this.logger.error(`createInstance failed: ${JSON.stringify(res.data)}`);
      throw new Error(
        (Array.isArray(res.data?.response?.message)
          ? res.data.response.message.join(', ')
          : res.data?.message) || 'Failed to create Evolution instance',
      );
    }

    // Don't set webhook before first QR — it can interrupt pairing.
    const qrFromCreate = this.extractQr(res.data);
    if (!qrFromCreate) {
      await this.sleep(1500);
    }
    return { data: res.data, qrcode: qrFromCreate || (await this.waitForQr(instanceName)) };
  }

  async ensureWebhook(instanceName: string) {
    return this.setWebhook(instanceName);
  }

  async setWebhook(instanceName: string) {
    const res = await this.client.post(`/webhook/set/${instanceName}`, {
      webhook: {
        enabled: true,
        url: this.webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    });
    if (res.status >= 400) {
      this.logger.warn(`setWebhook: ${JSON.stringify(res.data)}`);
    }
    return res.data;
  }

  async connect(instanceName: string) {
    const res = await this.client.get(`/instance/connect/${instanceName}`);
    if (res.status >= 400) {
      this.logger.warn(`connect failed: ${JSON.stringify(res.data)}`);
    }
    return res.data;
  }

  async logout(instanceName: string) {
    const res = await this.client.delete(`/instance/logout/${instanceName}`);
    return res.data;
  }

  async waitForQr(instanceName: string, attempts = 12): Promise<string | null> {
    for (let i = 0; i < attempts; i++) {
      const data = await this.connect(instanceName);
      const qr = this.extractQr(data);
      if (qr) return qr;
      this.logger.debug(`QR attempt ${i + 1}/${attempts} empty for ${instanceName}`);
      await this.sleep(2000);
    }
    return null;
  }

  extractQr(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const data = payload as Record<string, any>;

    const candidates = [
      data.base64,
      data.qrcode?.base64,
      data.qrcode?.code,
      data.qr?.base64,
      data.instance?.qrcode?.base64,
      typeof data.qrcode === 'string' ? data.qrcode : null,
      typeof data.code === 'string' && data.code.startsWith('data:') ? data.code : null,
      typeof data.code === 'string' && data.code.length > 200 ? data.code : null,
    ];

    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 50) {
        return c.startsWith('data:') ? c : `data:image/png;base64,${c}`;
      }
    }
    return null;
  }

  async connectionState(instanceName: string) {
    const res = await this.client.get(
      `/instance/connectionState/${instanceName}`,
    );
    return res.data;
  }

  async deleteInstance(instanceName: string) {
    try {
      await this.client.delete(`/instance/logout/${instanceName}`);
    } catch {
      /* ignore */
    }
    const res = await this.client.delete(`/instance/delete/${instanceName}`);
    return res.data;
  }

  async sendText(instanceName: string, number: string, text: string) {
    const res = await this.client.post(`/message/sendText/${instanceName}`, {
      number,
      text,
    });
    if (res.status >= 400) {
      this.logger.error(`sendText failed: ${JSON.stringify(res.data)}`);
      throw new Error(res.data?.message || 'Failed to send text');
    }
    return res.data;
  }

  async sendMedia(
    instanceName: string,
    number: string,
    opts: {
      mediatype: 'image' | 'video' | 'document' | 'audio';
      media: string;
      caption?: string;
      fileName?: string;
      mimetype?: string;
    },
  ) {
    const endpoint =
      opts.mediatype === 'audio'
        ? `/message/sendWhatsAppAudio/${instanceName}`
        : `/message/sendMedia/${instanceName}`;

    const body =
      opts.mediatype === 'audio'
        ? { number, audio: opts.media }
        : {
            number,
            mediatype: opts.mediatype,
            media: opts.media,
            caption: opts.caption,
            fileName: opts.fileName,
            mimetype: opts.mimetype,
          };

    const res = await this.client.post(endpoint, body);
    if (res.status >= 400) {
      this.logger.error(`sendMedia failed: ${JSON.stringify(res.data)}`);
      throw new Error(res.data?.message || 'Failed to send media');
    }
    return res.data;
  }

  getPublicApiUrl() {
    return process.env.PUBLIC_API_URL || 'http://localhost:3001';
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
