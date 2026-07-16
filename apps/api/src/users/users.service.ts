import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthUser } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private tenantIdOf(user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return user.tenantId;
  }

  list(user: AuthUser) {
    const tenantId = this.tenantIdOf(user);
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  agents(user: AuthUser) {
    const tenantId = this.tenantIdOf(user);
    return this.prisma.user.findMany({
      where: {
        tenantId,
        active: true,
        role: { in: [UserRole.AGENT, UserRole.SUPERVISOR, UserRole.ADMIN] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AuthUser, dto: CreateUserDto) {
    const tenantId = this.tenantIdOf(user);
    if (dto.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Cannot create superadmin');
    }
    if (user.role === UserRole.SUPERVISOR && dto.role !== UserRole.AGENT) {
      throw new ForbiddenException('Supervisor can only create agents');
    }
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already used');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        name: dto.name,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateUserDto) {
    const tenantId = this.tenantIdOf(user);
    const target = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!target) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.role) {
      if (dto.role === UserRole.SUPERADMIN) {
        throw new ForbiddenException();
      }
      data.role = dto.role;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }
}
