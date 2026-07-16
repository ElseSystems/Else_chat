import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadGatewayException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthUser } from '@else-chat/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class InstancesService {
  constructor(
    private prisma: PrismaService,
    private evolution: EvolutionService,
  ) {}

  private tenantId(user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('Tenant required');
    return user.tenantId;
  }

  list(user: AuthUser) {
    return this.prisma.whatsAppInstance.findMany({
      where: { tenantId: this.tenantId(user) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: AuthUser, name: string) {
    const tenantId = this.tenantId(user);
    const existing = await this.prisma.whatsAppInstance.findFirst({
      where: { tenantId, name },
    });
    if (existing) {
      throw new ConflictException('Já existe uma instância com esse nome');
    }

    const evolutionName = `t_${tenantId.slice(0, 8)}_${randomBytes(4).toString('hex')}`;

    const instance = await this.prisma.whatsAppInstance.create({
      data: {
        tenantId,
        name,
        evolutionName,
        status: 'CREATED',
      },
    });

    try {
      const { qrcode } = await this.evolution.createInstance(evolutionName);
      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { status: 'CONNECTING' },
      });

      // Configure webhook after pairing starts so QR is not interrupted.
      void this.evolution.ensureWebhook(evolutionName);

      const saved = await this.prisma.whatsAppInstance.findUnique({
        where: { id: instance.id },
      });
      return { ...saved, qrcode };
    } catch (err) {
      await this.prisma.whatsAppInstance.delete({ where: { id: instance.id } });
      throw err;
    }
  }

  async qr(user: AuthUser, id: string) {
    const instance = await this.findOwned(user, id);

    // Force a fresh pairing session when stuck without QR.
    try {
      await this.evolution.logout(instance.evolutionName);
      await new Promise((r) => setTimeout(r, 1000));
    } catch {
      /* ignore */
    }

    const qrcode = await this.evolution.waitForQr(instance.evolutionName, 15);
    if (!qrcode) {
      throw new BadGatewayException(
        'Evolution não gerou o QR Code. Remova a instância, crie novamente e aguarde ~10s.',
      );
    }

    await this.prisma.whatsAppInstance.update({
      where: { id },
      data: { status: 'CONNECTING' },
    });

    void this.evolution.ensureWebhook(instance.evolutionName);

    return {
      instance,
      qrcode,
    };
  }

  async status(user: AuthUser, id: string) {
    const instance = await this.findOwned(user, id);
    const state = await this.evolution.connectionState(instance.evolutionName);
    const conn = state?.instance?.state || state?.state || 'unknown';
    const status =
      conn === 'open' ? 'CONNECTED' : conn === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';
    await this.prisma.whatsAppInstance.update({
      where: { id },
      data: { status },
    });
    return { ...instance, status, connection: state };
  }

  async remove(user: AuthUser, id: string) {
    const instance = await this.findOwned(user, id);
    try {
      await this.evolution.deleteInstance(instance.evolutionName);
    } catch {
      /* ignore remote errors */
    }
    return this.prisma.whatsAppInstance.delete({ where: { id } });
  }

  async findOwned(user: AuthUser, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { id, tenantId: this.tenantId(user) },
    });
    if (!instance) throw new NotFoundException('Instance not found');
    return instance;
  }

  findByEvolutionName(evolutionName: string) {
    return this.prisma.whatsAppInstance.findUnique({
      where: { evolutionName },
    });
  }

  updateStatus(id: string, status: string, phoneNumber?: string) {
    return this.prisma.whatsAppInstance.update({
      where: { id },
      data: {
        status,
        ...(phoneNumber ? { phoneNumber } : {}),
      },
    });
  }
}
