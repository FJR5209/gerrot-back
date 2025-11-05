# 📋 Como Visualizar/Baixar Roteiros Criados

## Métodos para Ver seus Roteiros

### 1️⃣ **Via Script Automatizado** (Mais Fácil)

```bash
cd gerrot-backend

# 1. Primeiro, você precisa do token JWT (faça login)
# Execute o script de teste para obter o token:
bash test-roteiro.sh

# Copie o token que aparece na saída

# 2. Listar todos os seus roteiros:
bash ver-roteiro.sh "SEU_TOKEN_JWT_AQUI"

# 3. Ver um roteiro específico:
bash ver-roteiro.sh "SEU_TOKEN_JWT_AQUI" "ID_DO_PROJETO"
```

---

### 2️⃣ **Via cURL** (Linha de Comando)

#### Listar todos os roteiros:
```bash
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI" \
  | jq .
```

#### Ver um roteiro específico:
```bash
curl -X GET http://localhost:3000/projects/ID_DO_PROJETO \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI" \
  | jq .
```

**Exemplo:**
```bash
curl -X GET http://localhost:3000/projects/6907b436a0fc7a6a8b62c845 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  | jq .
```

---

### 3️⃣ **Via Arquivo HTTP** (VS Code)

1. Abra o arquivo `test-requests.http`
2. Execute os passos:
   - Primeiro faça login (copie o token)
   - Substitua `{cole-aqui-o-token-jwt}` pelo token
   - Execute a requisição "Listar todos os projetos"
   - Ou execute "Buscar projeto por ID" (substitua `{id}` pelo ID)

---

### 4️⃣ **Via Navegador/Postman**

#### URL para listar projetos:
```
GET http://localhost:3000/projects
Authorization: Bearer SEU_TOKEN_JWT
```

#### URL para buscar projeto específico:
```
GET http://localhost:3000/projects/6907b436a0fc7a6a8b62c845
Authorization: Bearer SEU_TOKEN_JWT
```

---

## 📊 O que você vai ver na resposta?

### Lista de Projetos:
```json
[
  {
    "id": "6907b436a0fc7a6a8b62c845",
    "title": "Roteiro de Teste - 2025-11-02",
    "scriptType": "social_media",
    "owner": {
      "id": "...",
      "email": "...",
      "name": "..."
    },
    "client": {
      "id": "...",
      "name": "Cliente de Teste"
    },
    "versions": [],
    "createdAt": "2025-11-02T19:42:46.319Z",
    "updatedAt": "2025-11-02T19:42:46.319Z"
  }
]
```

### Projeto Específico:
```json
{
  "id": "6907b436a0fc7a6a8b62c845",
  "title": "Roteiro de Teste - 2025-11-02",
  "scriptType": "social_media",
  "owner": {
    "id": "6907b435a0fc7a6a8b62c843",
    "email": "teste@example.com",
    "name": "Usuário de Teste"
  },
  "client": {
    "id": "6907b435a0fc7a6a8b62c844",
    "name": "Cliente de Teste - 14:41:58",
    "logoUrl": null
  },
  "versions": [],
  "createdAt": "2025-11-02T19:42:46.319Z",
  "updatedAt": "2025-11-02T19:42:46.319Z"
}
```

---

## 🔑 Como obter o Token JWT?

1. **Fazer login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@example.com",
    "password": "sua-senha"
  }'
```

2. **Copie o `accessToken` da resposta**

3. **Use esse token nas requisições**

---

## 💡 Dicas

- O campo `versions` mostra as versões do roteiro (por enquanto vazio `[]`)
- O campo `scriptType` pode ser: `social_media`, `internal`, ou `tv_commercial`
- Use `jq` para formatar melhor o JSON: `curl ... | jq .`

---

## 🎯 Exemplo Completo Passo a Passo

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}' \
  | jq -r '.accessToken')

# 2. Listar projetos
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# 3. Ver projeto específico (substitua ID)
curl -X GET http://localhost:3000/projects/SEU_PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

