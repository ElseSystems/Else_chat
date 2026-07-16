import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ConversationStatus,
  MessageDirection,
  MessageType,
} from '@prisma/client';
import { AuthUser } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { EvolutionService } from '../evolution/evolution.service';
import { MediaService } from '../media/media.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConversationsService))
    private conversations: ConversationsService,
    private evolution: EvolutionService,
    private media: MediaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtime: RealtimeGateway,
  ) {}

  async list(user: AuthUser, conversationId: string) {
    const conversation = await this.conversations.get(user, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendText(user: AuthUser, conversationId: string, body: string) {
    const conversation = await this.conversations.get(user, conversationId);
    this.assertCanReply(user, conversation);

    const phone = conversation.contact.phone;
    const result = await this.evolution.sendText(
      conversation.instance.evolutionName,
      phone,
      body,
    );

    const evoId =
      result?.key?.id || result?.message?.key?.id || result?.id || null;

    const message = await this.prisma.message.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        body,
        evolutionMessageId: evoId,
        senderUserId: user.id,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.realtime.emitConversationMessage(conversation, message);
    return message;
  }

  async sendMedia(
    user: AuthUser,
    conversationId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const conversation = await this.conversations.get(user, conversationId);
    this.assertCanReply(user, conversation);

    const stored = await this.media.saveUpload(file);
    const type = this.media.mapMimeToType(file.mimetype);
    const mediatype = this.media.mapTypeToEvolution(type);

    const publicUrl = `${this.evolution.getPublicApiUrl()}${stored.urlPath}`;
    const result = await this.evolution.sendMedia(
      conversation.instance.evolutionName,
      conversation.contact.phone,
      {
        mediatype,
        media: publicUrl,
        caption,
        fileName: file.originalname,
        mimetype: file.mimetype,
      },
    );

    const evoId =
      result?.key?.id || result?.message?.key?.id || result?.id || null;

    const message = await this.prisma.message.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId,
        type,
        direction: MessageDirection.OUTBOUND,
        body: caption || null,
        mediaUrl: stored.urlPath,
        mediaMimeType: file.mimetype,
        mediaFileName: file.originalname,
        evolutionMessageId: evoId,
        senderUserId: user.id,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.realtime.emitConversationMessage(conversation, message);
    return message;
  }

  private assertCanReply(
    user: AuthUser,
    conversation: {
      status: ConversationStatus;
      assignedToId: string | null;
    },
  ) {
    if (conversation.status === ConversationStatus.RESOLVED) {
      throw new ForbiddenException('Conversation resolved');
    }
    if (
      conversation.status === ConversationStatus.ASSIGNED &&
      conversation.assignedToId !== user.id &&
      user.role === 'AGENT'
    ) {
      throw new ForbiddenException('Not assigned to you');
    }
  }

  async ingestInbound(params: {
    tenantId: string;
    instanceId: string;
    phone: string;
    contactName?: string;
    type: MessageType;
    body?: string;
    mediaBuffer?: Buffer;
    mediaMimeType?: string;
    mediaFileName?: string;
    evolutionMessageId?: string;
  }) {
    if (params.evolutionMessageId) {
      const existing = await this.prisma.message.findFirst({
        where: {
          tenantId: params.tenantId,
          evolutionMessageId: params.evolutionMessageId,
        },
      });
      if (existing) return existing;
    }

    const contact = await this.prisma.contact.upsert({
      where: {
        tenantId_phone: { tenantId: params.tenantId, phone: params.phone },
      },
      create: {
        tenantId: params.tenantId,
        phone: params.phone,
        name: params.contactName || params.phone,
      },
      update: {
        name: params.contactName || undefined,
      },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId: params.tenantId,
        contactId: contact.id,
        instanceId: params.instanceId,
        status: { in: [ConversationStatus.WAITING, ConversationStatus.ASSIGNED] },
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        instance: true,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId: params.tenantId,
          contactId: contact.id,
          instanceId: params.instanceId,
          status: ConversationStatus.WAITING,
        },
        include: {
          contact: true,
          assignedTo: { select: { id: true, name: true } },
          instance: true,
        },
      });
    }

    let mediaUrl: string | undefined;
    if (params.mediaBuffer && params.mediaBuffer.length > 0) {
      const stored = await this.media.saveBuffer(
        params.mediaBuffer,
        params.mediaMimeType || 'application/octet-stream',
        params.mediaFileName || 'media',
      );
      mediaUrl = stored.urlPath;
    }

    const message = await this.prisma.message.create({
      data: {
        tenantId: params.tenantId,
        conversationId: conversation.id,
        type: params.type,
        direction: MessageDirection.INBOUND,
        body: params.body || null,
        mediaUrl: mediaUrl || null,
        mediaMimeType: params.mediaMimeType || null,
        mediaFileName: params.mediaFileName || null,
        evolutionMessageId: params.evolutionMessageId || null,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    const full = await this.conversations.getFull(conversation.id);
    this.realtime.emitToTenant(params.tenantId, 'conversation.updated', full);
    this.realtime.emitConversationMessage(conversation, message);
    return message;
  }
}
