#!/usr/bin/env zsh
set -euo pipefail

# Script para buildar, taggear e enviar a imagem Docker para um repositório ECR.
# Uso:
#   AWS_ACCOUNT_ID=718881314408 ./scripts/push-to-ecr.sh
# ou
#   ./scripts/push-to-ecr.sh 718881314408
# Opcional: export AWS_REGION, AWS_PROFILE, REPO_NAME

REGION=${AWS_REGION:-us-east-2}
PROFILE_FLAG=""
if [[ -n "${AWS_PROFILE:-}" ]]; then
  PROFILE_FLAG="--profile ${AWS_PROFILE}"
fi

if [[ -n "${1:-}" ]]; then
  AWS_ACCOUNT_ID="$1"
elif [[ -n "${AWS_ACCOUNT_ID:-}" ]]; then
  AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID"
else
  echo "Erro: AWS_ACCOUNT_ID não fornecido. Passe como argumento ou exporte AWS_ACCOUNT_ID." >&2
  echo "Ex: AWS_ACCOUNT_ID=718881314408 ./scripts/push-to-ecr.sh" >&2
  exit 1
fi

REPO_NAME=${REPO_NAME:-gerrot-backend}
LOCAL_IMAGE=${LOCAL_IMAGE:-gerrot-backend}

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

echo "ECR URI: $ECR_URI"
echo "Região: $REGION"

command -v aws >/dev/null 2>&1 || { echo >&2 "aws CLI não encontrado. Instale com: brew install awscli"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo >&2 "docker não encontrado. Instale Docker Desktop e inicie-o."; exit 1; }

echo "Verificando identidade AWS..."
aws $PROFILE_FLAG sts get-caller-identity --region "$REGION" || { echo "Falha ao obter identidade AWS. Verifique credenciais."; exit 1; }

echo "Fazendo login no ECR..."
aws $PROFILE_FLAG ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Construindo imagem Docker localmente: ${LOCAL_IMAGE}"
docker build -t "${LOCAL_IMAGE}" .

echo "Taggando imagem para ECR: ${ECR_URI}:latest"
docker tag "${LOCAL_IMAGE}:latest" "${ECR_URI}:latest"

echo "Enviando imagem para ECR..."
docker push "${ECR_URI}:latest"

echo "Imagem enviada com sucesso para ${ECR_URI}:latest"
echo "Verificando imagens no ECR..."
aws $PROFILE_FLAG ecr describe-images --repository-name "$REPO_NAME" --region "$REGION" || true

echo "Pronto. Agora você pode criar/atualizar o serviço no App Runner apontando para: ${ECR_URI}:latest"
