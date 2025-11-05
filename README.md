# GERROT Backend

Backend para geração assistida de roteiros usando IA (Google Gemini) com exportação para PDF.

## 🚀 Funcionalidades

- ✅ Autenticação JWT completa
- ✅ CRUD de Clientes
- ✅ CRUD de Projetos
- ✅ Geração de conteúdo com IA (Google Gemini) via WebSocket
- ✅ Geração assíncrona de PDFs
- ✅ Banco de dados persistente (MongoDB/PostgreSQL)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- MongoDB (local ou MongoDB Atlas)
- Redis (opcional, mas recomendado para filas)

### Instalando MongoDB

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Ou use MongoDB Atlas** (gratuito): https://www.mongodb.com/cloud/atlas

## 🔧 Instalação

1. Instale as dependências:
```bash
cd gerrot-backend
npm install
```

2. Configure as variáveis de ambiente. Crie um arquivo `.env` na raiz do `gerrot-backend`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (MongoDB)
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/gerrot
DATABASE_NAME=gerrot

# Ou use MongoDB Atlas (nuvem)
# DATABASE_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/gerrot?retryWrites=true&w=majority

# Alternativa: PostgreSQL
# DATABASE_TYPE=postgres
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=postgres
# DATABASE_NAME=gerrot

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui-mude-em-producao
JWT_EXPIRES_IN=7d

# Redis (opcional, mas recomendado)
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Gemini AI
GEMINI_API_KEY=sua-chave-gemini-aqui

# CORS (produção)
# FRONTEND_URL=http://localhost:3001
```

3. Execute o servidor:
```bash
npm run start:dev
```

## 📚 API Endpoints

### Autenticação (Públicas)

- `POST /auth/register` - Registrar novo usuário
  ```json
  {
    "email": "user@example.com",
    "name": "Nome do Usuário",
    "password": "senha123"
  }
  ```

- `POST /auth/login` - Fazer login
  ```json
  {
    "email": "user@example.com",
    "password": "senha123"
  }
  ```
  Retorna: `{ "accessToken": "jwt-token", "user": {...} }`

### Clientes (Requerem Autenticação)

- `GET /clients` - Listar clientes
- `POST /clients` - Criar cliente
  ```json
  {
    "name": "Nome do Cliente"
  }
  ```
- `GET /clients/:id` - Obter cliente
- `PATCH /clients/:id` - Atualizar cliente
- `DELETE /clients/:id` - Deletar cliente
- `PATCH /clients/:id/logo` - Upload de logo (multipart/form-data)

### Projetos (Requerem Autenticação)

- `GET /projects` - Listar projetos (filtrados por usuário autenticado)
- `POST /projects` - Criar projeto
  ```json
  {
    "title": "Título do Projeto",
    "scriptType": "social_media",
    "clientId": "uuid-do-cliente"
  }
  ```
  Tipos: `social_media`, `internal`, `tv_commercial`
- `GET /projects/:id` - Obter projeto
- `PATCH /projects/:id` - Atualizar projeto
- `DELETE /projects/:id` - Deletar projeto

### Geração de PDF

- `POST /projects/:projectId/versions/:versionId/export-pdf` - Solicitar geração de PDF

## 🔐 Autenticação

Todas as rotas (exceto `/auth/*` e `/health`) requerem autenticação via JWT.

Envie o token no header:
```
Authorization: Bearer <seu-jwt-token>
```

## 🌐 WebSocket

Conecte-se via Socket.IO para interação com IA em tempo real:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Conectar ao projeto
socket.emit('join_project', { projectId: 'uuid-do-projeto' });

// Enviar prompt
socket.emit('send_prompt', {
  projectId: 'uuid-do-projeto',
  prompt: 'Me dê 3 ganchos para este roteiro',
  fullContext: 'Contexto do roteiro...',
  settings: {
    audience: 'Jovens (18-25)',
    tone: 'Engraçado'
  }
});

// Receber chunks em tempo real
socket.on('ai_chunk', (data) => {
  console.log('Chunk:', data.textChunk);
});

// Resposta completa
socket.on('ai_finished', (data) => {
  console.log('Resposta completa:', data.fullResponse);
});
```

## 📄 Scripts Disponíveis

- `npm run start:dev` - Desenvolvimento com hot-reload
- `npm run build` - Compilar TypeScript
- `npm run start` - Produção
- `npm run stop` - Parar servidor na porta 3000

## 🗄️ Banco de Dados

O projeto usa **MongoDB** como banco padrão:
- Suporta tipos complexos (enums, objetos, arrays)
- Escalável e flexível
- Pode usar MongoDB local ou MongoDB Atlas (nuvem)

**Alternativa:** PostgreSQL também é suportado configurando `DATABASE_TYPE=postgres`.

As coleções são criadas automaticamente na primeira execução (`synchronize: true` em desenvolvimento).

## 🔍 Troubleshooting

**Erro ao conectar ao banco:**
- Verifique se o arquivo `.env` está configurado corretamente
- Para SQLite, verifique permissões de escrita no diretório

**Erro "JWT_SECRET não configurado":**
- Adicione `JWT_SECRET` no arquivo `.env`

**Worker não inicializa:**
- Redis é opcional, mas recomendado. O sistema funciona sem ele, mas com avisos.

## 📝 Notas

- Em produção, configure `NODE_ENV=production` e desabilite `synchronize`
- Use um `JWT_SECRET` forte e seguro
- Configure CORS adequadamente com `FRONTEND_URL`

