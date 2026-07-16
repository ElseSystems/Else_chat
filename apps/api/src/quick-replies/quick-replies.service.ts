import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuickRepliesService {
  constructor(private prisma: PrismaService) {}

  private tenantId(user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return user.tenantId;
  }

  list(user: AuthUser) {
    return this.prisma.quickReply.findMany({
      where: { tenantId: this.tenantId(user) },
      orderBy: { title: 'asc' },
    });
  }

  create(user: AuthUser, title: string, body: string) {
    return this.prisma.quickReply.create({
      data: { tenantId: this.tenantId(user), title, body },
    });
  }

  async remove(user: AuthUser, id: string) {
    const item = await this.prisma.quickReply.findFirst({
      where: { id, tenantId: this.tenantId(user) },
    });
    if (!item) throw new NotFoundException();
    return this.prisma.quickReply.delete({ where: { id } });
  }
}
