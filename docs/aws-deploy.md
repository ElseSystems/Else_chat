# Else Chat — Deploy AWS

## Arquitetura alvo

```
Internet
   │
   ▼
Application Load Balancer (HTTPS)
   │
   ├── / ──────────────► ECS Service: web (Next.js, Ubuntu image)
   ├── /api & /socket.io ► ECS Service: api (NestJS, Ubuntu image)
   └── /webhooks ──────► ECS Service: api
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     RDS PostgreSQL     ElastiCache Redis     S3 (mídias)
          ▲
          │
   ECS Service: evolution-api
```

## Serviços recomendados

| Componente | AWS |
|------------|-----|
| Containers api/web/evolution | ECS Fargate + ECR |
| Banco | RDS PostgreSQL Multi-AZ (prod) |
| Cache / filas leves | ElastiCache Redis |
| Mídias | S3 + CloudFront (opcional) |
| Segredos | Secrets Manager (`JWT_SECRET`, `EVOLUTION_API_KEY`, DB) |
| DNS/TLS | Route 53 + ACM |
| Logs | CloudWatch Logs |

Alternativa menor custo / MVP: **EC2** com Docker Compose (mesmo `docker-compose.yml`), Elastic IP + Nginx/Caddy.

## Estimativa de custo mensal (ordem de grandeza, us-east-1)

| Perfil | Estimativa |
|--------|------------|
| MVP (1 EC2 t3.medium + EBS + domínio) | ~US$ 40–70 |
| Produção pequena (Fargate 2 tasks + RDS db.t4g.micro + Redis cache.t4g.micro + ALB + S3) | ~US$ 120–200 |

Valores variam por região, tráfego e armazenamento de mídia.

## Variáveis de produção

- `DATABASE_URL` — RDS
- `REDIS_URL` — ElastiCache
- `JWT_SECRET` — Secrets Manager
- `PUBLIC_API_URL` — URL pública HTTPS da API (necessário para Evolution baixar mídia outbound)
- `EVOLUTION_API_URL` — URL interna do serviço Evolution no cluster
- `EVOLUTION_WEBHOOK_URL` — `https://api.seudominio.com/webhooks/evolution`
- `CORS_ORIGIN` — origem do painel
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` — URL pública da API

## Passos de deploy (ECS)

1. Criar ECR repos: `elsechat-api`, `elsechat-web`
2. Build/push imagens (`docker/api.Dockerfile`, `docker/web.Dockerfile`)
3. Criar RDS + Redis + S3 + secrets
4. Task definitions Fargate: api, web, evolution
5. ALB com regras de path/host
6. Rodar `prisma migrate deploy` (entrypoint da API já executa)
7. Health checks: `GET /health` na API

## Checklist pós-deploy

- [ ] HTTPS válido
- [ ] Webhook Evolution alcança a API
- [ ] Upload de mídia acessível pela Evolution (`PUBLIC_API_URL`)
- [ ] Seed desabilitado em produção (trocar CMD da API se necessário)
- [ ] Backup RDS automático
- [ ] WAF opcional no ALB

## IaC incluso

Template inicial em [`infra/aws/cloudformation-mvp.yaml`](../infra/aws/cloudformation-mvp.yaml):

- VPC (subnets públicas/privadas)
- Security groups (ALB, ECS, RDS, Redis)
- RDS PostgreSQL 16 (`db.t4g.micro`)
- ElastiCache Redis (`cache.t4g.micro`)
- ECS Cluster + execution role
- Bucket S3 para mídias

Depois do primeiro push das imagens no ECR, complete com ALB + Fargate services (`api` :3001 health `/health`, `web` :3000) usando path routing no listener. Referência oficial: [ECS + ALB target groups](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ecs/README.html).

Para gerar o restante com o plugin **AWS Deployments**, no Cursor:

> Deploy Else Chat to AWS using the docker-compose services (api, web, evolution, postgres, redis)
