import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConversationStatus, Prisma, UserRole } from '@prisma/client';
import { AuthUser, canSeeAllConversations } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtime: RealtimeGateway,
  ) {}

  private tenantId(user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return user.tenantId;
  }

  async list(user: AuthUser, tab: 'waiting' | 'mine' | 'all' = 'mine') {
    const tenantId = this.tenantId(user);
    const where: Prisma.ConversationWhereInput = { tenantId };

    if (tab === 'waiting') {
      where.status = ConversationStatus.WAITING;
    } else if (tab === 'mine') {
      where.assignedToId = user.id;
      where.status = { in: [ConversationStatus.ASSIGNED, ConversationStatus.WAITING] };
    } else if (tab === 'all') {
      if (!canSeeAllConversations(user.role as never)) {
        throw new ForbiddenException('Not allowed to see all conversations');
      }
      where.status = { not: ConversationStatus.RESOLVED };
    }

    // Agents cannot browse "all"; waiting is OK
    if (user.role === UserRole.AGENT && tab === 'mine') {
      where.assignedToId = user.id;
      where.status = ConversationStatus.ASSIGNED;
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        department: true,
        instance: { select: { id: true, name: true, phoneNumber: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async get(user: AuthUser, id: string) {
    const tenantId = this.tenantId(user);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        department: true,
        instance: true,
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) throw new NotFoundException();
    this.assertAccess(user, conversation);
    return conversation;
  }

  assertAccess(
    user: AuthUser,
    conversation: { assignedToId: string | null; tenantId: string; status: ConversationStatus },
  ) {
    if (user.tenantId !== conversation.tenantId) {
      throw new ForbiddenException();
    }
    if (canSeeAllConversations(user.role as never)) return;
    if (conversation.status === ConversationStatus.WAITING) return;
    if (conversation.assignedToId !== user.id) {
      throw new ForbiddenException('Conversation not assigned to you');
    }
  }

  async claim(user: AuthUser, id: string) {
    const tenantId = this.tenantId(user);
    const updated = await this.prisma.conversation.updateMany({
      where: {
        id,
        tenantId,
        status: ConversationStatus.WAITING,
      },
      data: {
        status: ConversationStatus.ASSIGNED,
        assignedToId: user.id,
      },
    });
    if (updated.count === 0) {
      throw new ConflictException('Conversation already claimed or not waiting');
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CLAIM',
        entityType: 'Conversation',
        entityId: id,
      },
    });

    const conversation = await this.getFull(id);
    this.realtime.emitToTenant(tenantId, 'conversation.updated', conversation);
    return conversation;
  }

  async transfer(
    user: AuthUser,
    id: string,
    opts: { toUserId?: string; departmentId?: string },
  ) {
    const conversation = await this.get(user, id);

    if (
      user.role === UserRole.AGENT &&
      conversation.assignedToId !== user.id
    ) {
      throw new ForbiddenException();
    }

    const data: Prisma.ConversationUpdateInput = {
      status: ConversationStatus.ASSIGNED,
    };
    if (opts.toUserId) {
      const target = await this.prisma.user.findFirst({
        where: { id: opts.toUserId, tenantId: conversation.tenantId, active: true },
      });
      if (!target) throw new NotFoundException('Target user not found');
      data.assignedTo = { connect: { id: opts.toUserId } };
    }
    if (opts.departmentId) {
      data.department = { connect: { id: opts.departmentId } };
    }

    await this.prisma.conversation.update({ where: { id }, data });
    await this.prisma.auditLog.create({
      data: {
        tenantId: conversation.tenantId,
        userId: user.id,
        action: 'TRANSFER',
        entityType: 'Conversation',
        entityId: id,
        meta: opts,
      },
    });

    const full = await this.getFull(id);
    this.realtime.emitToTenant(conversation.tenantId, 'conversation.updated', full);
    return full;
  }

  async resolve(user: AuthUser, id: string) {
    const conversation = await this.get(user, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { status: ConversationStatus.RESOLVED },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: conversation.tenantId,
        userId: user.id,
        action: 'RESOLVE',
        entityType: 'Conversation',
        entityId: id,
      },
    });
    const full = await this.getFull(id);
    this.realtime.emitToTenant(conversation.tenantId, 'conversation.updated', full);
    return full;
  }

  async addNote(user: AuthUser, id: string, body: string) {
    const conversation = await this.get(user, id);
    const note = await this.prisma.internalNote.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId: id,
        authorId: user.id,
        body,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    this.realtime.emitToTenant(conversation.tenantId, 'note.created', {
      conversationId: id,
      note,
    });
    return note;
  }

  getFull(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        department: true,
        instance: { select: { id: true, name: true, phoneNumber: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async metrics(user: AuthUser) {
    const tenantId = this.tenantId(user);
    const [waiting, assigned, resolvedToday] = await Promise.all([
      this.prisma.conversation.count({
        where: { tenantId, status: ConversationStatus.WAITING },
      }),
      this.prisma.conversation.count({
        where: { tenantId, status: ConversationStatus.ASSIGNED },
      }),
      this.prisma.conversation.count({
        where: {
          tenantId,
          status: ConversationStatus.RESOLVED,
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { waiting, assigned, resolvedToday };
  }
}
