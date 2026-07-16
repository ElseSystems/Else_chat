import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, instances: true } } },
    });
  }

  async create(dto: CreateTenantDto) {
    const slug = dto.slug.toLowerCase();
    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Slug already exists');

    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase() },
    });
    if (emailTaken) throw new ConflictException('Admin email already used');

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug,
          plan: dto.plan || 'starter',
        },
      });
      await tx.department.create({
        data: { tenantId: tenant.id, name: 'Geral' },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase(),
          name: dto.adminName,
          passwordHash,
          role: UserRole.ADMIN,
        },
      });
      return tenant;
    });
  }

  async get(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, active: true } },
        instances: true,
        departments: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.prisma.tenant.update({ where: { id }, data: { status } });
  }
}
