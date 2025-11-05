# Módulo 5 - IA com WebSocket (Chat Interativo)

Este módulo implementa a interação em tempo real com a API do Google Gemini usando WebSockets.

## Configuração

1. Obtenha uma API Key do Google Gemini:
   - Acesse: https://makersuite.google.com/app/apikey
   - Crie uma nova chave

2. Adicione no `.env`:
```
GEMINI_API_KEY=sua-chave-aqui
```

## Eventos WebSocket

### Frontend → Backend

#### `join_project`
Conecta o cliente a um projeto específico.
```json
{
  "projectId": "uuid-do-projeto"
}
```

**Resposta:** `joined_project`
```json
{
  "projectId": "uuid-do-projeto",
  "message": "Conectado ao projeto com sucesso"
}
```

#### `send_prompt`
Envia um prompt para gerar conteúdo.
```json
{
  "projectId": "uuid-do-projeto",
  "prompt": "Me dê 3 ganchos para este roteiro",
  "fullContext": "Texto completo do roteiro atual...",
  "settings": {
    "audience": "Jovens (18-25)",
    "tone": "Engraçado",
    "objective": "Vender Produto X"
  }
}
```

### Backend → Frontend

#### `ai_started`
Indica que a geração começou.
```json
{
  "message": "Processando sua solicitação..."
}
```

#### `ai_chunk`
Chunk de texto em tempo real (streaming).
```json
{
  "textChunk": "Claro! "
}
```

#### `ai_finished`
Geração concluída.
```json
{
  "fullResponse": "Texto completo gerado...",
  "message": "Geração concluída"
}
```

#### `ai_error`
Erro durante a geração.
```json
{
  "message": "Descrição do erro"
}
```

## Exemplo de Uso no Frontend

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Conectar ao projeto
socket.emit('join_project', { projectId: 'uuid-do-projeto' });

// Enviar prompt
socket.emit('send_prompt', {
  projectId: 'uuid-do-projeto',
  prompt: 'Me dê 3 ganchos',
  fullContext: 'Contexto do roteiro...',
  settings: {
    audience: 'Jovens (18-25)',
    tone: 'Engraçado'
  }
});

// Receber chunks em tempo real
socket.on('ai_chunk', (data) => {
  console.log('Chunk recebido:', data.textChunk);
  // Adicionar ao texto na tela
  document.getElementById('output').innerHTML += data.textChunk;
});

// Quando terminar
socket.on('ai_finished', (data) => {
  console.log('Resposta completa:', data.fullResponse);
});

// Tratamento de erro
socket.on('ai_error', (data) => {
  console.error('Erro:', data.message);
});
```

