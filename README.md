# AtendeChat (código pronto)

Este repositório agora usa o código-fonte do **AtendeChat** em [`codatendechat-main/`](codatendechat-main/).

## Subir local (Docker)

1. Abra o **Docker Desktop**
2. Rode:

```bash
cd codatendechat-main
chmod +x start-local.sh
./start-local.sh
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:3000 |

### Login (seed)

- Email: `admin@admin.com`
- Senha: `123456`

## Desenvolvimento sem rebuild completo

Alternativa mais leve (só infra no Docker):

```bash
cd codatendechat-main
docker compose up -d postgres redis
# configurar backend/.env apontando DB_HOST=localhost DB_PORT=5433 e REDIS_URI=redis://localhost:6380
cd backend && npm install --legacy-peer-deps && npm run watch
cd frontend && npm install --legacy-peer-deps && npm start
```

## AWS / produção

O caminho oficial do fornecedor continua sendo Ubuntu 22.04 + aaPanel + instalador. O Compose local serve para desenvolver e adaptar o white-label.
