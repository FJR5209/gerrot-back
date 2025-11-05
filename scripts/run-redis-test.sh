#!/usr/bin/env zsh
set -euo pipefail

# Script helper para testar conectividade Redis para o projeto.
# Comportamento:
# - Se REDIS_URL estiver definido, usa ele e roda `node scripts/test-redis.js`.
# - Se REDIS_HOST/REDIS_PORT/REDIS_PASSWORD estiverem definidos, monta REDIS_URL e testa.
# - Caso contrário, tenta iniciar um Redis local em Docker (container gerrot-redis-test) e testa contra ele.
# - Se UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN estiverem definidos, pode opcionalmente testar o endpoint REST com --test-rest.
# - Mantém o container local rodando apenas durante o teste (pára/removes se foi criado pelo script).

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
NODE_TEST="$SCRIPT_DIR/test-redis.js"

if [[ ! -f "$NODE_TEST" ]]; then
  echo "Arquivo de teste não encontrado: $NODE_TEST" >&2
  exit 1
fi

USE_LOCAL=false
TEST_REST=false

for arg in "$@"; do
  case "$arg" in
    --local)
      USE_LOCAL=true
      ;;
    --test-rest)
      TEST_REST=true
      ;;
    -h|--help)
      echo "Uso: $0 [--local] [--test-rest]"
      echo "  --local     Força uso de um Redis local via Docker (porta 6379)"
      echo "  --test-rest Testa também o endpoint REST do Upstash (se variáveis REST estiverem definidas)"
      exit 0
      ;;
  esac
done

started_container=false
container_name=gerrot-redis-test

run_node_test() {
  echo "Executando teste Node (PING)..."
  if ! node "$NODE_TEST"; then
    return 2
  fi
  return 0
}

# Optional REST test
if [[ "$TEST_REST" == "true" ]]; then
  if [[ -n "${UPSTASH_REDIS_REST_URL:-}" && -n "${UPSTASH_REDIS_REST_TOKEN:-}" ]]; then
    echo "Testando endpoint REST do Upstash... (não usa BullMQ)"
    if command -v curl >/dev/null 2>&1; then
      if curl -sS -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_REDIS_REST_URL/ping" | grep -q PONG; then
        echo "REST PING: PONG"
      else
        echo "REST PING falhou (verifique UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN)" >&2
      fi
    else
      echo "curl não encontrado; pulei teste REST" >&2
    fi
  else
    echo "Variáveis REST do Upstash não definidas; pulando teste REST." >&2
  fi
fi

# Determine REDIS_URL
if [[ -n "${REDIS_URL:-}" ]]; then
  echo "Usando REDIS_URL já definido na sessão.";
  run_node_test; exit $?;
fi

if [[ "$USE_LOCAL" == "true" ]]; then
  echo "Forçando uso de Redis local via Docker (--local).";
else
  if [[ -n "${REDIS_HOST:-}" || -n "${REDIS_PORT:-}" ]]; then
    # montar URL
    host=${REDIS_HOST:-localhost}
    port=${REDIS_PORT:-6379}
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
      export REDIS_URL="redis://:${REDIS_PASSWORD}@${host}:${port}"
    else
      export REDIS_URL="redis://${host}:${port}"
    fi
    echo "Montada REDIS_URL a partir de host/port.";
    run_node_test; exit $?;
  fi
fi

# Se chegamos aqui, vamos tentar iniciar um Redis local via Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "docker não encontrado. Instale Docker Desktop e tente novamente." >&2
  exit 1
fi

echo "Verificando se container $container_name já existe..."
if docker ps --filter name="${container_name}" --format '{{.Names}}' | grep -q "${container_name}"; then
  echo "Container ${container_name} já em execução. Usando-o para o teste.";
else
  echo "Iniciando container Redis local (${container_name})..."
  docker run --rm -d --name ${container_name} -p 6379:6379 redis:7 >/dev/null
  started_container=true
  # esperar até que esteja pronto
  echo "Aguardando Redis inicializar..."
  sleep 1
fi

export REDIS_URL="redis://localhost:6379"
export REDIS_HOST=localhost
export REDIS_PORT=6379

run_node_test
rc=$?

# Se criamos o container, parar/limpar
if [[ "$started_container" == "true" ]]; then
  echo "Parando container ${container_name}..."
  docker stop ${container_name} >/dev/null || true
fi

exit $rc
