# Else Chat

SaaS multi-empresa de multi-atendimento WhatsApp (estilo AtendeChat / Movedesk).

- **API:** NestJS + Prisma + Socket.IO  
- **Painel:** Next.js  
- **WhatsApp:** Evolution API v2  
- **Runtime:** Docker Compose (Ubuntu para `api` e `web`)

## Isolamento

| Papel | Fila | Próprias | Outras | Transferir |
|-------|------|----------|--------|------------|
| Atendente | Sim | Sim | Não | Sim (próprias) |
| Supervisor / Admin | Sim | Sim | Sim | Sim |
| Super-admin | Gestão de tenants | — | — | — |

## Subir com Docker

```bash
cp .env.example .env
docker compose up --build -d
```

Serviços:

| URL | Serviço |
|-----|---------|
| http://localhost:3000 | Painel |
| http://localhost:3001 | API |
| http://localhost:8080 | Evolution API |

### Contas seed

| Usuário | Senha | Papel |
|---------|-------|-------|
| `super@elsechat.com` | `admin123` | Super-admin |
| `admin@demo.com` | `admin123` | Admin tenant demo |
| `supervisor@demo.com` | `agent123` | Supervisor |
| `agente1@demo.com` | `agent123` | Atendente |
| `agente2@demo.com` | `agent123` | Atendente |

## Desenvolvimento local (sem Docker da app)

1. Suba só infra: `docker compose up -d postgres redis evolution`
2. `cp .env.example .env` e ajuste `DATABASE_URL` / `EVOLUTION_API_URL` para `localhost`
3. `npm install`
4. `npm run build -w @else-chat/shared`
5. `cd apps/api && npx prisma migrate deploy && npx ts-node --transpile-only prisma/seed.ts`
6. `npm run dev:api` e `npm run dev:web`

## Fluxo típico

1. Login como `admin@demo.com`
2. **WhatsApp** → criar instância → escanear QR
3. Cliente envia mensagem no WhatsApp → cai em **Aguardando**
4. Atendente **pega** a conversa → só ele vê em **Minhas**
5. Supervisor vê **Todas** e pode transferir
6. Envie texto, imagem, áudio, vídeo ou documento pelo composer

## AWS

Veja [docs/aws-deploy.md](docs/aws-deploy.md) para arquitetura, custo estimado e passos de deploy (ECS/ECR/RDS/S3).
