# 🧪 Como Testar a Criação de Roteiro

## Pré-requisitos
1. Servidor rodando: `npm run start:dev`
2. Banco de dados configurado

## Fluxo de Teste Completo

### Passo 1: Verificar se o servidor está rodando
```bash
curl http://localhost:3000/health
```
**Resposta esperada:**
```json
{"status":"ok","service":"gerrot-backend"}
```

---

### Passo 2: Registrar um usuário
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "name": "Usuário de Teste",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "email": "teste@example.com",
  "name": "Usuário de Teste",
  "message": "Usuário criado com sucesso"
}
```

---

### Passo 3: Fazer login e obter token JWT
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "teste@example.com"
  }
}
```

⚠️ **IMPORTANTE:** Copie o `accessToken` da resposta. Você vai usar ele nas próximas requisições.

---

### Passo 4: Criar um cliente
```bash
curl -X POST http://localhost:3000/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "name": "Cliente Teste"
  }'
```

**Resposta esperada:**
```json
{
  "id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "name": "Cliente Teste",
  "logoUrl": null
}
```

⚠️ **Copie o `id` do cliente** - você vai precisar dele para criar o projeto.

---

### Passo 5: Criar um projeto (roteiro)
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "title": "Roteiro de Teste - Campanha de Verão",
    "scriptType": "social_media",
    "clientId": "ID_DO_CLIENTE_AQUI"
  }'
```

**Tipos de roteiro disponíveis:**
- `social_media` - Para redes sociais
- `internal` - Para uso interno
- `tv_commercial` - Para comercial de TV

**Resposta esperada:**
```json
{
  "id": "65a1b2c3d4e5f6g7h8i9j0k3",
  "title": "Roteiro de Teste - Campanha de Verão",
  "scriptType": "social_media",
  "owner": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "teste@example.com",
    "name": "Usuário de Teste"
  },
  "client": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "name": "Cliente Teste",
    "logoUrl": null
  },
  "versions": [],
  "createdAt": "2025-01-XX...",
  "updatedAt": "2025-01-XX..."
}
```

✅ **Sucesso!** O roteiro foi criado!

---

### Passo 6: Listar todos os projetos
```bash
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:** Lista com todos os projetos do usuário autenticado.

---

### Passo 7: Buscar projeto específico
```bash
curl -X GET http://localhost:3000/projects/ID_DO_PROJETO_AQUI \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:** Detalhes completos do projeto, incluindo versões (se existirem).

---

## 🚀 Teste Rápido com Script Automatizado

Copie o script abaixo e cole no terminal (substitua SEU_TOKEN quando necessário):

```bash
#!/bin/bash

echo "🔍 1. Testando Health Check..."
curl -s http://localhost:3000/health | jq .

echo -e "\n📝 2. Registrando usuário..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste'$(date +%s)'@example.com",
    "name": "Usuário Teste",
    "password": "senha123"
  }')
echo $REGISTER_RESPONSE | jq .

EMAIL=$(echo $REGISTER_RESPONSE | jq -r '.email')

echo -e "\n🔐 3. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"senha123\"
  }")
echo $LOGIN_RESPONSE | jq .

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

echo -e "\n👤 4. Criando cliente..."
CLIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cliente de Teste"
  }')
echo $CLIENT_RESPONSE | jq .

CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.id')

echo -e "\n📄 5. Criando projeto (roteiro)..."
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"Roteiro de Teste - $(date +%Y-%m-%d)\",
    \"scriptType\": \"social_media\",
    \"clientId\": \"$CLIENT_ID\"
  }")
echo $PROJECT_RESPONSE | jq .

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id')

echo -e "\n✅ 6. Buscando projeto criado..."
curl -s -X GET http://localhost:3000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n🎉 Teste concluído! Projeto criado com sucesso!"
```

---

## 📱 Usando o arquivo test-requests.http

Você também pode usar o arquivo `test-requests.http` no VS Code com a extensão REST Client:

1. Abra o arquivo `gerrot-backend/test-requests.http`
2. Execute os passos na ordem:
   - Primeiro: Registrar usuário
   - Segundo: Fazer login (copie o token)
   - Terceiro: Substitua `{cole-aqui-o-token-jwt}` pelo token
   - Quarto: Criar cliente (copie o ID)
   - Quinto: Criar projeto (substitua `cole-aqui-o-id-do-cliente` pelo ID do cliente)

---

## 🔍 Verificando se Funcionou

✅ **Sucesso se:**
- Status code: `201 Created` ao criar projeto
- Resposta JSON contém `id`, `title`, `scriptType`, `client`, `owner`
- Campo `versions` existe (mesmo que vazio `[]`)

❌ **Erro comum:**
- `401 Unauthorized` → Token inválido ou expirado
- `400 Bad Request` → Dados inválidos (ex: `scriptType` errado)
- `404 Not Found` → Cliente não encontrado (verifique o `clientId`)

---

## 💡 Dicas

1. **Teste diferentes tipos de roteiro:**
   - `social_media`
   - `internal`
   - `tv_commercial`

2. **Verifique os logs do servidor** para ver mensagens de sucesso/erro

3. **Use `jq` para formatar JSON:**
   ```bash
   curl ... | jq .
   ```

4. **Para testar via navegador:**
   Use ferramentas como Postman, Insomnia ou Thunder Client (VS Code)

