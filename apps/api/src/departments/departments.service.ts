import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  private tenantId(user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return user.tenantId;
  }

  list(user: AuthUser) {
    return this.prisma.department.findMany({
      where: { tenantId: this.tenantId(user) },
      orderBy: { name: 'asc' },
    });
  }

  create(user: AuthUser, name: string) {
    return this.prisma.department.create({
      data: { tenantId: this.tenantId(user), name },
    });
  }

  async remove(user: AuthUser, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId: this.tenantId(user) },
    });
    if (!dept) throw new NotFoundException();
    return this.prisma.department.delete({ where: { id } });
  }
}
