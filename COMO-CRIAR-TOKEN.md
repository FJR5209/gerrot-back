# 🔐 Como Criar Token de Acesso (JWT)

Este guia mostra passo a passo como criar um token de acesso para usar na API.

## 📋 Pré-requisitos

- Servidor rodando em `http://localhost:3000`
- Cliente HTTP (Postman, Insomnia, curl, ou extensão REST Client no VS Code)

## 🚀 Passo a Passo

### **Passo 1: Registrar um Usuário**

Primeiro, você precisa criar uma conta no sistema.

**Endpoint:** `POST /auth/register`

**Exemplo usando curl:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "name": "Nome do Usuário",
    "password": "senha123"
  }'
```

**Exemplo usando Postman/Insomnia:**
- Método: `POST`
- URL: `http://localhost:3000/auth/register`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "usuario@example.com",
  "name": "Nome do Usuário",
  "password": "senha123"
}
```

**Resposta esperada:**
```json
{
  "id": "uuid-do-usuario",
  "email": "usuario@example.com",
  "name": "Nome do Usuário",
  "message": "Usuário criado com sucesso"
}
```

---

### **Passo 2: Fazer Login e Obter Token**

Agora faça login para receber o token JWT.

**Endpoint:** `POST /auth/login`

**Exemplo usando curl:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123"
  }'
```

**Exemplo usando Postman/Insomnia:**
- Método: `POST`
- URL: `http://localhost:3000/auth/login`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Resposta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkIiwiaWF0IjoxNjk4NzY1NDMyLCJleHAiOjE2OTkzNzAyMzJ9.xxx",
  "user": {
    "userId": "uuid-do-usuario",
    "email": "usuario@example.com"
  }
}
```

---

### **Passo 3: Usar o Token nas Requisições**

Copie o `accessToken` da resposta e use no header `Authorization` de todas as requisições protegidas.

**Formato do header:**
```
Authorization: Bearer {seu-token-aqui}
```

**Exemplo usando curl:**
```bash
curl -X GET http://localhost:3000/clients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Exemplo usando Postman/Insomnia:**
- Vá em **Authorization** → **Type: Bearer Token**
- Cole o token no campo **Token**

---

## 📝 Arquivo test-requests.http

Se você usar VS Code com a extensão **REST Client**, pode usar o arquivo `test-requests.http`:

1. Abra o arquivo `test-requests.http`
2. Execute primeiro a requisição de registro (linha ~8)
3. Depois execute o login (linha ~17)
4. Copie o token retornado
5. Substitua `{cole-aqui-o-token-jwt}` em todas as outras requisições

---

## ⚠️ Validade do Token

Por padrão, o token expira em **7 dias** (configurável no `.env` com `JWT_EXPIRES_IN`).

Se o token expirar, faça login novamente para obter um novo token.

---

## 🔒 Exemplo Completo (Terminal)

```bash
# 1. Registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Teste","password":"senha123"}'

# 2. Login (salve o token retornado)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}' \
  | jq -r '.accessToken')

# 3. Usar o token
curl -X GET http://localhost:3000/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Teste Rápido

Você pode testar rapidamente com este script:

```bash
# Registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gerrot.com",
    "name": "Administrador",
    "password": "admin123"
  }'

# Login e mostrar token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gerrot.com",
    "password": "admin123"
  }' | jq
```

O token JWT será exibido no campo `accessToken` da resposta!

