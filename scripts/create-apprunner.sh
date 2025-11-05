#!/usr/bin/env zsh
set -euo pipefail

# Script auxiliar para criar um serviço App Runner apontando para a imagem ECR.
# Requer AWS CLI v2 configurado e permissões adequadas.
# Uso:
#   AWS_ACCOUNT_ID=718881314408 ./scripts/create-apprunner.sh
# ou
#   ./scripts/create-apprunner.sh 718881314408

if [[ -n "${1:-}" ]]; then
  AWS_ACCOUNT_ID="$1"
elif [[ -n "${AWS_ACCOUNT_ID:-}" ]]; then
  AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID"
else
  echo "Erro: AWS_ACCOUNT_ID não fornecido. Passe como argumento ou exporte AWS_ACCOUNT_ID." >&2
  exit 1
fi

REGION=${AWS_REGION:-us-east-2}
REPO_NAME=${REPO_NAME:-gerrot-backend}
IMAGE_TAG=${IMAGE_TAG:-latest}
SERVICE_NAME=${SERVICE_NAME:-gerrot-back-service}

ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

echo "Criando App Runner service ${SERVICE_NAME} com imagem ${ECR_IMAGE}"

cat > /tmp/apprunner-source-config.json <<JSON
{
  "ImageRepository": {
    "ImageIdentifier": "${ECR_IMAGE}",
    "ImageRepositoryType": "ECR"
  }
}
JSON

aws apprunner create-service \
  --service-name "${SERVICE_NAME}" \
  --source-configuration "ImageRepository={ImageIdentifier=${ECR_IMAGE},ImageRepositoryType=ECR}" \
  --instance-configuration "Cpu=1024,Memory=2048" \
  --region "${REGION}"

echo "Comando enviado. Verifique o console do App Runner para status e variáveis de ambiente."
