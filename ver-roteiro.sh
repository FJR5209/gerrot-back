#!/bin/bash

# Script para visualizar roteiros criados
# Uso: bash ver-roteiro.sh [PROJECT_ID]

BASE_URL="http://localhost:3000"

echo "📋 Ver Roteiros Criados"
echo "======================="

# Verificar se projeto ID foi fornecido
if [ -z "$1" ]; then
  echo -e "\n❌ Erro: Você precisa fornecer o token JWT e opcionalmente o ID do projeto"
  echo "Uso: bash ver-roteiro.sh TOKEN_JWT [PROJECT_ID]"
  echo ""
  echo "Exemplo:"
  echo "  bash ver-roteiro.sh 'seu-token-aqui'"
  echo "  bash ver-roteiro.sh 'seu-token-aqui' '6907b436a0fc7a6a8b62c845'"
  exit 1
fi

TOKEN="$1"
PROJECT_ID="$2"

# 1. Listar todos os projetos
echo -e "\n📋 Listando todos os seus projetos..."
LIST_RESPONSE=$(curl -s -X GET $BASE_URL/projects \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | jq . 2>/dev/null || echo "$LIST_RESPONSE"

PROJECT_COUNT=$(echo "$LIST_RESPONSE" | jq '. | length' 2>/dev/null || echo "0")
echo -e "\n✅ Total de projetos encontrados: $PROJECT_COUNT"

# 2. Se um ID específico foi fornecido, buscar detalhes
if [ ! -z "$PROJECT_ID" ]; then
  echo -e "\n🔍 Buscando projeto específico (ID: $PROJECT_ID)..."
  GET_RESPONSE=$(curl -s -X GET $BASE_URL/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN")
  
  echo "$GET_RESPONSE" | jq . 2>/dev/null || echo "$GET_RESPONSE"
  
  # Extrair informações importantes
  TITLE=$(echo "$GET_RESPONSE" | jq -r '.title' 2>/dev/null)
  CLIENT=$(echo "$GET_RESPONSE" | jq -r '.client.name' 2>/dev/null)
  SCRIPT_TYPE=$(echo "$GET_RESPONSE" | jq -r '.scriptType' 2>/dev/null)
  VERSIONS_COUNT=$(echo "$GET_RESPONSE" | jq -r '.versions | length' 2>/dev/null)
  
  if [ "$TITLE" != "null" ] && [ ! -z "$TITLE" ]; then
    echo -e "\n📄 Detalhes do Roteiro:"
    echo "   Título: $TITLE"
    echo "   Cliente: $CLIENT"
    echo "   Tipo: $SCRIPT_TYPE"
    echo "   Versões: $VERSIONS_COUNT"
    echo "   ID: $PROJECT_ID"
  fi
fi

echo -e "\n💡 Dica: Para ver um projeto específico, use:"
echo "   bash ver-roteiro.sh TOKEN ID_DO_PROJETO"

