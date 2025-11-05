#!/usr/bin/env zsh
set -euo pipefail

# Cria um arquivo .env local a partir de .env.example sem inserir segredos.
# Uso: ./scripts/setup-env.sh

if [[ ! -f .env.example ]]; then
  echo ".env.example não encontrado. Abortando." >&2
  exit 1
fi

if [[ -f .env ]]; then
  echo ".env já existe. Não vou sobrescrever. Se quiser recriar, remova .env primeiro." >&2
  exit 0
fi

cp .env.example .env
cat > /dev/stderr <<'MSG'
.env criado a partir de .env.example em ./ .
Edite o arquivo `.env` e cole as credenciais reais (DATABASE_URL, REDIS_URL / REDIS_HOST, REDIS_PASSWORD, JWT_SECRET, etc.).

Recomendações:
- Não comite `.env` no repositório.
- Use AWS Secrets Manager para variáveis sensíveis quando for deploy no App Runner.
- Para Upstash prefira REDIS_URL (redis:// or rediss://). Não use o REST token para ioredis.

Depois de editar, você pode rodar o script para build/push:
  AWS_ACCOUNT_ID=718881314408 ./scripts/push-to-ecr.sh

MSG

exit 0
