#!/bin/bash

# Script completo para criar roteiro e gerar PDF
# Uso: bash test-criar-roteiro-completo.sh

BASE_URL="http://localhost:3000"
EMAIL="teste$(date +%s)@example.com"
PASSWORD="senha123"

echo "🎬 Teste Completo: Criar Roteiro e Gerar PDF"
echo "=============================================="

# 1. Health Check
echo -e "\n🔍 1. Verificando servidor..."
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Servidor está rodando"
else
  echo "❌ Servidor não está respondendo"
  exit 1
fi

# 2. Registrar usuário
echo -e "\n📝 2. Registrando usuário..."
REGISTER=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"name\": \"Usuário Teste\",
    \"password\": \"$PASSWORD\"
  }")

if echo "$REGISTER" | grep -q "criado com sucesso"; then
  echo "✅ Usuário registrado"
elif echo "$REGISTER" | grep -q "já está em uso"; then
  echo "⚠️  Email já existe, continuando..."
else
  echo "❌ Erro ao registrar: $REGISTER"
  exit 1
fi

# 3. Login
echo -e "\n🔐 3. Fazendo login..."
LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Erro ao obter token"
  exit 1
fi

echo "✅ Token obtido"

# 4. Criar cliente
echo -e "\n👤 4. Criando cliente..."
CLIENT=$(curl -s -X POST $BASE_URL/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sem Fronteiras Internet"
  }')

CLIENT_ID=$(echo "$CLIENT" | jq -r '.id' 2>/dev/null)

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
  echo "❌ Erro ao criar cliente"
  exit 1
fi

echo "✅ Cliente criado: $CLIENT_ID"

# 5. Criar projeto
echo -e "\n📄 5. Criando projeto..."
PROJECT=$(curl -s -X POST $BASE_URL/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Roteiro Reels - Sem Fronteiras (Assis Brasil)\",
    \"scriptType\": \"social_media\",
    \"clientId\": \"$CLIENT_ID\"
  }")

PROJECT_ID=$(echo "$PROJECT" | jq -r '.id' 2>/dev/null)
PROJECT_CLIENT_ID=$(echo "$PROJECT" | jq -r '.clientId' 2>/dev/null)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "❌ Erro ao criar projeto"
  echo "$PROJECT" | jq . 2>/dev/null || echo "$PROJECT"
  exit 1
fi

echo "✅ Projeto criado: $PROJECT_ID"

# Verificar se o projeto tem clientId (importante para MongoDB)
if [ -z "$PROJECT_CLIENT_ID" ] || [ "$PROJECT_CLIENT_ID" = "null" ]; then
  echo "⚠️  Aviso: Projeto criado mas não tem clientId salvo. Verificando projeto completo..."
  GET_PROJECT=$(curl -s -X GET $BASE_URL/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN")
  
  PROJECT_CLIENT_ID=$(echo "$GET_PROJECT" | jq -r '.clientId' 2>/dev/null)
  
  if [ -z "$PROJECT_CLIENT_ID" ] || [ "$PROJECT_CLIENT_ID" = "null" ]; then
    echo "❌ ERRO: Projeto criado sem clientId. Isso impedirá a geração de PDF."
    echo "   Por favor, verifique os logs do servidor."
    exit 1
  fi
fi

echo "✅ Projeto tem clientId: $PROJECT_CLIENT_ID"

# 6. Criar versão de roteiro
echo -e "\n📝 6. Criando versão de roteiro com conteúdo..."
VERSION_CONTENT="[0s - 3s]:
Cena: Maria Clara na agência, olhando para o celular e falando para a câmera.
Narração: \"A internet Sem Fronteiras funciona muito bem em Assis Brasil!\"
TNT: \"A melhor internet de Assis Brasil\"

[3s - 6s]:
Cena: Corte para Maria Clara usando notebook ou assistindo TV.
Off / Narração: \"É ótima — rápida, estável e sem complicações!\"
TNT: \"Rápida • Estável • Sem dor de cabeça\"

[6s - 10s]:
Cena: Close-up dela usando o celular, WhatsApp ou site aberto.
Off / Narração: \"Dá pra trabalhar, estudar, assistir tudo online... sem travar e com qualidade de verdade!\"
TNT: \"Trabalhe, estude e assista sem travar\"

[10s - 18s]:
Cena: Maria Clara falando diretamente para a câmera, gesticulando e sorrindo.
Off / Narração: \"Moradores de Assis Brasil, entre em contato com a equipe Sem Fronteiras, escolha seu plano e tenha a melhor internet do Acre!\"
TNT: \"Fale com a equipe agora • Escolha seu plano\"

[18s - 25s]:
Cena: Maria Clara sorrindo, mostrando interface do site \"sem fronteir\", gesticulando e convidando.
Narração: \"Todo mundo em Assis Brasil já está conectado com a Sem Fronteiras. Venha você também!\"
TNT: \"Conecte-se com a melhor internet do Acre\"

[25s - 30s] - Tela final:
Cena: Tela limpa com logo Sem Fronteiras em destaque."

VERSION=$(curl -s -X POST $BASE_URL/projects/$PROJECT_ID/versions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"content\": $(echo "$VERSION_CONTENT" | jq -Rs .)
  }")

VERSION_ID=$(echo "$VERSION" | jq -r '.id' 2>/dev/null)

if [ -z "$VERSION_ID" ] || [ "$VERSION_ID" = "null" ]; then
  echo "❌ Erro ao criar versão"
  echo "$VERSION" | jq . 2>/dev/null || echo "$VERSION"
  exit 1
fi

echo "✅ Versão criada: $VERSION_ID"
echo "   Versão número: $(echo "$VERSION" | jq -r '.versionNumber' 2>/dev/null)"

# 7. Verificar versão criada
echo -e "\n🔍 7. Verificando versão criada..."
GET_VERSION=$(curl -s -X GET $BASE_URL/projects/$PROJECT_ID/versions/$VERSION_ID \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_VERSION" | grep -q "não encontrada"; then
  echo "⚠️  Versão não encontrada, mas continuando..."
else
  echo "✅ Versão encontrada"
fi

# 8. Gerar PDF
echo -e "\n📄 8. Gerando PDF..."
PDF_RESPONSE=$(curl -s -X POST $BASE_URL/projects/$PROJECT_ID/versions/$VERSION_ID/export-pdf \
  -H "Authorization: Bearer $TOKEN")

echo "$PDF_RESPONSE" | jq . 2>/dev/null || echo "$PDF_RESPONSE"

DOWNLOAD_URL=$(echo "$PDF_RESPONSE" | jq -r '.downloadUrl' 2>/dev/null)
STATUS=$(echo "$PDF_RESPONSE" | jq -r '.status' 2>/dev/null)

if [ "$STATUS" = "completed" ] && [ ! -z "$DOWNLOAD_URL" ]; then
  echo "✅ PDF gerado com sucesso!"
  echo "   URL: http://localhost:3000$DOWNLOAD_URL"
elif [ "$STATUS" = "pending" ]; then
  echo "✅ PDF enfileirado para geração (Redis disponível)"
  JOB_ID=$(echo "$PDF_RESPONSE" | jq -r '.jobId' 2>/dev/null)
  echo "   Job ID: $JOB_ID"
  echo "   Você receberá notificação quando estiver pronto"
else
  echo "❌ Erro ao gerar PDF"
  echo "$PDF_RESPONSE"
fi

echo -e "\n🎉 Processo concluído!"
echo "=================================="
echo "📝 Resumo:"
echo "   Usuário: $EMAIL"
echo "   Cliente ID: $CLIENT_ID"
echo "   Projeto ID: $PROJECT_ID"
echo "   Versão ID: $VERSION_ID"
if [ ! -z "$DOWNLOAD_URL" ]; then
  echo "   PDF: http://localhost:3000$DOWNLOAD_URL"
fi

