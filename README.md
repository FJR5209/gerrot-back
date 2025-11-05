# Gerrot Frontend

Frontend web para o sistema Gerrot - plataforma de geração e gerenciamento de roteiros com IA.

## �� Tecnologias

- **React 19** + **TypeScript**
- **Vite** - Build tool e dev server
- **Tailwind CSS 4** - Estilização
- **Socket.IO Client** - Streaming em tempo real da IA
- **Axios** - Requisições HTTP
- **React Router** - Navegação

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Backend Gerrot rodando (porta 3000 por padrão)

## ⚙️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:

Crie/edite o arquivo `.env`:
```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:3000
```

## 🏃 Executando

```bash
npm run dev
```

Acesse: **http://localhost:5173**

## 🎯 Funcionalidades Implementadas

✅ Gestão de Projetos (criar, listar, visualizar)  
✅ Editor de Roteiros com versionamento  
✅ Geração com IA (Socket.IO streaming em tempo real)  
✅ Exportação PDF  
✅ Proxy configurado (sem CORS em desenvolvimento)

## 📁 Estrutura

```
src/
├── api/          # Configuração Axios
├── components/   # Componentes reutilizáveis
├── hooks/        # Custom hooks (useAIStreaming)
├── pages/        # Páginas (Projects, ProjectDetail)
└── App.tsx       # Rotas principais
```

## 📡 Backend Integration

**REST API:**
- `GET /projects` - Listar
- `POST /projects` - Criar
- `GET /projects/:id/versions` - Versões
- `POST /projects/:id/versions` - Nova versão
- `POST /projects/:id/versions/:versionId/export-pdf`

**Socket.IO:**
- `send_prompt` → `ai_chunk` → `ai_finished`

## 🐛 Troubleshooting

**CORS:** Certifique-se que `VITE_API_URL=/api` e backend na porta 3000  
**Socket:** Verifique `VITE_SOCKET_URL` no .env  
**Tailwind:** Reinstale: `npm install -D @tailwindcss/postcss`

---

**Desenvolvido com ❤️ para criação de roteiros**
