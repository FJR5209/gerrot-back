#!/bin/bash

# Script para testar criação de roteiro
# Uso: bash test-roteiro.sh

BASE_URL="http://localhost:3000"
EMAIL="teste$(date +%s)@example.com"
PASSWORD="senha123"

echo "🧪 Teste de Criação de Roteiro"
echo "================================"

# 1. Health Check
echo -e "\n🔍 1. Testando Health Check..."
HEALTH=$(curl -s $BASE_URL/health)
echo "$HEALTH"
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Servidor está rodando"
else
  echo "❌ Servidor não está respondendo. Execute: npm run start:dev"
  exit 1
fi

# 2. Registrar usuário
echo -e "\n📝 2. Registrando usuário: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"name\": \"Usuário de Teste\",
    \"password\": \"$PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q "criado com sucesso"; then
  echo "✅ Usuário registrado"
elif echo "$REGISTER_RESPONSE" | grep -q "já está em uso"; then
  echo "⚠️  Email já existe, continuando..."
else
  echo "❌ Erro ao registrar usuário"
  exit 1
fi

# 3. Login
echo -e "\n🔐 3. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Erro ao obter token. Verifique email/senha."
  exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:50}..."

# 4. Criar cliente
echo -e "\n👤 4. Criando cliente..."
CLIENT_RESPONSE=$(curl -s -X POST $BASE_URL/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cliente de Teste - '"$(date +%H:%M:%S)"'"
  }')

echo "$CLIENT_RESPONSE" | jq . 2>/dev/null || echo "$CLIENT_RESPONSE"

CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
  echo "❌ Erro ao criar cliente"
  exit 1
fi

echo "✅ Cliente criado: $CLIENT_ID"

# 5. Verificar se cliente foi realmente criado (debug)
echo -e "\n🔍 5.1. Verificando se cliente existe..."
VERIFY_CLIENT=$(curl -s -X GET $BASE_URL/clients/$CLIENT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "$VERIFY_CLIENT" | jq . 2>/dev/null || echo "$VERIFY_CLIENT"

# 5. Criar projeto (roteiro)
echo -e "\n📄 5.2. Criando projeto (roteiro) com clientId: $CLIENT_ID..."
PROJECT_RESPONSE=$(curl -s -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Roteiro de Teste - $(date +%Y-%m-%d)\",
    \"scriptType\": \"social_media\",
    \"clientId\": \"$CLIENT_ID\"
  }")

echo "$PROJECT_RESPONSE" | jq . 2>/dev/null || echo "$PROJECT_RESPONSE"

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "❌ Erro ao criar projeto"
  exit 1
fi

echo "✅ Projeto criado: $PROJECT_ID"

# 6. Buscar projeto criado
echo -e "\n🔍 6. Buscando projeto criado..."
GET_PROJECT=$(curl -s -X GET $BASE_URL/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_PROJECT" | jq . 2>/dev/null || echo "$GET_PROJECT"

# 7. Listar todos os projetos
echo -e "\n📋 7. Listando todos os projetos..."
LIST_PROJECTS=$(curl -s -X GET $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN")

PROJECT_COUNT=$(echo "$LIST_PROJECTS" | jq '. | length' 2>/dev/null || echo "0")
echo "Total de projetos: $PROJECT_COUNT"
echo "$LIST_PROJECTS" | jq '.[] | {id, title, scriptType}' 2>/dev/null || echo "$LIST_PROJECTS"

echo -e "\n🎉 Teste concluído com sucesso!"
echo "=================================="
echo "📝 Projeto criado:"
echo "   ID: $PROJECT_ID"
echo "   Email do usuário: $EMAIL"
echo "   Token: ${TOKEN:0:50}..."

