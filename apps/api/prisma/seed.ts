import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const agentHash = await bcrypt.hash('agent123', 10);

  const superadmin = await prisma.user.upsert({
    where: { email: 'super@elsechat.com' },
    update: {},
    create: {
      email: 'super@elsechat.com',
      name: 'Super Admin',
      passwordHash,
      role: UserRole.SUPERADMIN,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Empresa Demo',
      slug: 'demo',
      plan: 'pro',
    },
  });

  await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Geral' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Geral' },
  });

  await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Suporte' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Suporte' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      name: 'Admin Demo',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'supervisor@demo.com',
      name: 'Supervisor Demo',
      passwordHash: agentHash,
      role: UserRole.SUPERVISOR,
    },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: 'agente1@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'agente1@demo.com',
      name: 'Agente Um',
      passwordHash: agentHash,
      role: UserRole.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'agente2@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'agente2@demo.com',
      name: 'Agente Dois',
      passwordHash: agentHash,
      role: UserRole.AGENT,
    },
  });

  const existingQr = await prisma.quickReply.findFirst({
    where: { tenantId: tenant.id, title: 'Saudação' },
  });
  if (!existingQr) {
    await prisma.quickReply.create({
      data: {
        tenantId: tenant.id,
        title: 'Saudação',
        body: 'Olá! Bem-vindo ao atendimento. Como posso ajudar?',
      },
    });
  }

  console.log('Seed OK');
  console.log({
    superadmin: superadmin.email,
    admin: admin.email,
    supervisor: supervisor.email,
    agent1: agent1.email,
    agent2: agent2.email,
    passwords: { admin: 'admin123', agents: 'agent123' },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
