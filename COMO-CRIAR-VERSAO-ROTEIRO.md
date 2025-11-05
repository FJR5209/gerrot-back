# 📝 Como Criar Versão de Roteiro e Gerar PDF

## Fluxo Completo

### 1️⃣ **Criar Projeto** (se ainda não tiver)

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "title": "Roteiro Reels - Sem Fronteiras (Assis Brasil)",
    "scriptType": "social_media",
    "clientId": "ID_DO_CLIENTE"
  }'
```

Copie o `id` do projeto criado.

---

### 2️⃣ **Criar Versão de Roteiro**

```bash
curl -X POST http://localhost:3000/projects/PROJECT_ID/versions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "content": "[0s - 3s]:\nCena: Maria Clara na agência, olhando para o celular e falando para a câmera.\nNarração: \"A internet Sem Fronteiras funciona muito bem em Assis Brasil!\"\nTNT: \"A melhor internet de Assis Brasil\"\n\n[3s - 6s]:\nCena: Corte para Maria Clara usando notebook ou assistindo TV.\nOff / Narração: \"É ótima — rápida, estável e sem complicações!\"\nTNT: \"Rápida • Estável • Sem dor de cabeça\""
  }'
```

**Exemplo de conteúdo estruturado:**

```json
{
  "content": "[0s - 3s]:\nCena: Maria Clara na agência...\nNarração: \"A internet Sem Fronteiras...\"\nTNT: \"A melhor internet de Assis Brasil\"\n\n[3s - 6s]:\nCena: Corte para Maria Clara...\nNarração: \"É ótima — rápida...\"\nTNT: \"Rápida • Estável • Sem dor de cabeça\""
}
```

Copie o `id` da versão criada.

---

### 3️⃣ **Gerar PDF**

```bash
curl -X POST http://localhost:3000/projects/PROJECT_ID/versions/VERSION_ID/export-pdf \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta (202 Accepted):**
```json
{
  "status": "pending",
  "message": "Seu PDF foi enviado para a fila de geração.",
  "jobId": "job-uuid"
}
```

---

### 4️⃣ **Baixar PDF**

O PDF será gerado em background. Quando pronto, você receberá uma notificação WebSocket (ou pode verificar na resposta da versão que terá o campo `generatedPdfUrl`).

**URL do PDF:**
```
http://localhost:3000/pdfs/roteiro-VERSION_ID-TIMESTAMP.pdf
```

---

## 📋 Exemplo Completo (Script)

```bash
#!/bin/bash

TOKEN="SEU_TOKEN_AQUI"
CLIENT_ID="ID_DO_CLIENTE"

# 1. Criar projeto
PROJECT=$(curl -s -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Roteiro Reels - Sem Fronteiras (Assis Brasil)\",
    \"scriptType\": \"social_media\",
    \"clientId\": \"$CLIENT_ID\"
  }")

PROJECT_ID=$(echo "$PROJECT" | jq -r '.id')
echo "✅ Projeto criado: $PROJECT_ID"

# 2. Criar versão de roteiro
VERSION=$(curl -s -X POST http://localhost:3000/projects/$PROJECT_ID/versions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "[0s - 3s]:\nCena: Maria Clara na agência, olhando para o celular e falando para a câmera.\nNarração: \"A internet Sem Fronteiras funciona muito bem em Assis Brasil!\"\nTNT: \"A melhor internet de Assis Brasil\"\n\n[3s - 6s]:\nCena: Corte para Maria Clara usando notebook ou assistindo TV.\nOff / Narração: \"É ótima — rápida, estável e sem complicações!\"\nTNT: \"Rápida • Estável • Sem dor de cabeça\""
  }')

VERSION_ID=$(echo "$VERSION" | jq -r '.id')
echo "✅ Versão criada: $VERSION_ID"

# 3. Gerar PDF
PDF_JOB=$(curl -s -X POST http://localhost:3000/projects/$PROJECT_ID/versions/$VERSION_ID/export-pdf \
  -H "Authorization: Bearer $TOKEN")

echo "✅ PDF enfileirado para geração"
echo "$PDF_JOB" | jq .
```

---

## 🔍 Verificar Versões de um Projeto

```bash
curl -X GET http://localhost:3000/projects/PROJECT_ID/versions \
  -H "Authorization: Bearer SEU_TOKEN" \
  | jq .
```

---

## 📄 Ver uma Versão Específica

```bash
curl -X GET http://localhost:3000/projects/PROJECT_ID/versions/VERSION_ID \
  -H "Authorization: Bearer SEU_TOKEN" \
  | jq .
```

---

## ✏️ Atualizar Conteúdo de uma Versão

```bash
curl -X PATCH http://localhost:3000/projects/PROJECT_ID/versions/VERSION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "content": "Novo conteúdo do roteiro..."
  }'
```

---

## 🗑️ Deletar uma Versão

```bash
curl -X DELETE http://localhost:3000/projects/PROJECT_ID/versions/VERSION_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 💡 Dicas

1. **Formato do Conteúdo:** Você pode criar o conteúdo em qualquer formato (texto simples, markdown, JSON). O sistema renderizará no PDF.

2. **Geração Automática:** Em breve você poderá usar a IA (via WebSocket) para gerar o conteúdo automaticamente com base no tipo de roteiro e cliente.

3. **Versões:** Cada versão é numerada automaticamente (v1, v2, v3...), mantendo um histórico do roteiro.

4. **PDF:** O PDF é gerado em background usando Puppeteer e salvo em `gerrot-backend/pdfs/`.

