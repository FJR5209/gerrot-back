# Frontend — Integração com o backend Gerrot

Este documento descreve passo-a-passo como criar um frontend completo que integra com o backend do projeto Gerrot (Socket.IO streaming para IA + REST para CRUD de projetos/versões e exportação PDF).

Conteúdo:
- Resumo da arquitetura
- Stack recomendada e comandos iniciais
- Variáveis de ambiente
- Estrutura de pastas sugerida
- Autenticação (JWT)
- Conexão WebSocket e eventos esperados
- Payloads exatos para `send_prompt`
- Hooks/Components de exemplo (React + TypeScript)
- Salvando versões e exportando PDF (REST)
- UX e boas práticas
- Testes, segurança e deploy
- Demo mínimo (HTML/JS)

---

## 1. Resumo da arquitetura

- Comunicação em tempo real: Socket.IO (frontend ↔ backend) — usado para enviar prompts e receber streaming incremental (`ai_chunk`).
- REST API: endpoints protegidos por JWT para CRUD de projetos e versões e para solicitar export de PDF.
- Backend já oferece mapeamento de `scriptType` → template e lógica de prompt engineering (few-shot). O frontend deve enviar `scriptType` em `context` para o backend aplicar o few-shot específico.

---

## 2. Stack recomendada

- React + TypeScript (Vite) — leve e rápido para prototipagem
- socket.io-client — streaming WebSocket
- axios — requisições REST
- react-query (opcional) — cache e chamadas REST
- tailwindcss ou sua biblioteca de UI preferida

Comandos rápidos (Vite + React + TS):
```bash
npm create vite@latest gerrot-frontend -- --template react-ts
cd gerrot-frontend
npm install socket.io-client axios react-router-dom
npm run dev
```

---

## 3. Variáveis de ambiente (frontend)

Crie `.env` (ou no host) com:
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

OBS: prefixo `VITE_` é necessário para acesso via import.meta.env.

---

## 4. Estrutura de pastas sugerida

```
src/
  api/
    axios.ts
    projects.ts
  components/
    AiSidebar.tsx
    ScriptEditor.tsx
    PdfExportButton.tsx
  hooks/
    useAIStreaming.ts
    useAuth.ts
  pages/
    ProjectsPage.tsx
    ProjectDetail.tsx
  App.tsx
  main.tsx
```

---

## 5. Autenticação (JWT)

- As rotas REST de projetos/versões exigem JWT (veja `src/modules/4-projects/projects.routes.ts` do backend).
- Inclua o header `Authorization: Bearer <token>` nas chamadas REST.
- Para Socket.IO, você pode enviar token no `auth` do cliente: `io(url, { auth: { token } })`. (O gateway atual não exige token, mas é boa prática para produção.)

Exemplo de `src/api/axios.ts`:
```ts
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## 6. WebSocket: eventos e fluxo

Fluxo recomendado:
1. Conectar Socket.IO.
2. `emit('join_project', { projectId })` — registrar-se no projeto.
3. `emit('send_prompt', payload)` — enviar prompt/contesto/task.
4. Ouvir eventos:
   - `ai_started` — indica que a geração começou.
   - `ai_chunk` — chunks incrementais: `{ textChunk }`.
   - `ai_finished` — `{ fullResponse }` com texto final.
   - `ai_error` — `{ message }`.

O backend (`src/modules/5-ai/ai.gateway.ts`) aceita o payload com as chaves `context` e `task` e agora garante que `settings.scriptType` e `templateName` cheguem ao `AiService`.

---

## 7. Payload `send_prompt` (especificação)

Estrutura:
```json
{
  "projectId": "optional_if_joined",
  "context": {
    "scriptType": "vt | social_media | internal | tv_commercial",
    "duracao": 30,
    "publicoAlvo": "Jovens 18-25",
    "objetivo": "Conversão",
    "templateName": "optional_custom_template.txt",
    "tone": "informativo",
    "themes": ["tema1","tema2"]
  },
  "task": {
    "currentScriptContent": "texto já existente do roteiro",
    "userPrompt": "Gere um roteiro de 30s com 3 blocos destacando os benefícios X e Y"
  }
}
```

Observações:
- Se você já fez `join_project`, `projectId` é opcional.
- `scriptType` é importante para aplicar few-shot específico e escolha do template.

---

## 8. Hook React exemplo: `useAIStreaming`

Arquivo: `src/hooks/useAIStreaming.ts`
```ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useAIStreaming(projectId: string, token?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'idle'|'running'|'error'|'done'>('idle');
  const [partial, setPartial] = useState<string>('');
  const [error, setError] = useState<string|undefined>();

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL;
    const socket = io(url, { auth: token ? { token } : undefined, autoConnect: false });
    socketRef.current = socket;

    socket.connect();

    socket.on('connect', () => {
      if (projectId) socket.emit('join_project', { projectId });
    });

    socket.on('ai_started', () => { setStatus('running'); setPartial(''); });
    socket.on('ai_chunk', (payload: any) => { setPartial((p) => p + (payload.textChunk || '')); });
    socket.on('ai_finished', (payload: any) => { setStatus('done'); setPartial(payload.fullResponse || ''); });
    socket.on('ai_error', (payload: any) => { setStatus('error'); setError(payload.message || 'Erro IA'); });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [projectId, token]);

  const sendPrompt = (context: any, task: { currentScriptContent?: string; userPrompt: string }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_prompt', { projectId, context, task });
  };

  return { status, partial, error, sendPrompt };
}
```

---

## 9. Component example: `AiSidebar.tsx`

Comportamento:
- Recebe `projectId`, `currentScript`, `onSaveGenerated`.
- Usa `useAIStreaming` para controlar geração e mostrar preview incremental.

(Pseudocódigo resumido)
```tsx
// botões: Gerar | Salvar
// textarea: mostra partial (live)
// onSaveGenerated -> chama POST /projects/:projectId/versions
```

---

## 10. Salvar versão gerada (REST)

Endpoint para criar versão:
- POST `/projects/:projectId/versions`
- Body exemplo:
```json
{ "title": "Versão gerada automática", "content": "<texto gerado>", "autoGenerate": false }
```

Lembre-se de enviar `Authorization` header com JWT.

---

## 11. Exportar PDF (REST)

Endpoint do backend:
- POST `/projects/:projectId/versions/:versionId/export-pdf`

Após sucesso, PDF estará disponível em `${VITE_API_URL}/pdfs/<arquivo.pdf>`. O botão de exportar no frontend deve:
1. Chamar o POST export-pdf.
2. Mostrar spinner até retorno.
3. Abrir nova aba com link para `${VITE_API_URL}/pdfs/<arquivo.pdf>` quando pronto.

---

## 12. UX e boas práticas

- Mostrar loader durante a geração; append incremental aos poucos em um preview.
- Permitir edição do texto final antes de salvar/exportar.
- Validar `duracao` e `scriptType` antes de enviar.
- Tratar erros do backend (quota, modelo indisponível) e oferecer fallback (ex.: aviso e opção de tentar novamente com gerador local).

---

## 13. Testes

- Unit tests do hook `useAIStreaming` com um mock de Socket.IO.
- E2E: Cypress / Playwright cobrindo: criar projeto via REST, conectar Socket, gerar roteiro, salvar versão e exportar PDF.

---

## 14. Segurança e deploy

- Nunca armazenar `GEMINI_API_KEY` no frontend. Fique apenas no backend.
- Forneça HTTPS para socket e REST em produção.
- Defina `FRONTEND_URL` no backend `.env` para CORS seguro.
- Habilite rate-limit para endpoints de IA (se necessário).

---

## 15. Demo mínimo (HTML/JS) - arquivo de teste rápido

Crie um `demo.html` com:
```html
<!doctype html>
<html>
<head><meta charset="utf-8"><title>AI Test</title></head>
<body>
  <button id="connect">Connect</button>
  <button id="gen">Generate</button>
  <pre id="out"></pre>
  <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
  <script>
    let socket;
    document.getElementById('connect').onclick = () => {
      socket = io('http://localhost:3000', { auth: {} });
      socket.on('connect', ()=>{ console.log('connected'); socket.emit('join_project', { projectId: 'PROJECT_ID_123' }); });
      socket.on('ai_chunk', (c)=>{ document.getElementById('out').textContent += c.textChunk; });
      socket.on('ai_finished', (d)=>{ document.getElementById('out').textContent += '\n---DONE---\n' + d.fullResponse; });
    };
    document.getElementById('gen').onclick = () => {
      socket.emit('send_prompt', {
        context: { scriptType: 'vt', duracao: 30, publicoAlvo: 'Jovens'},
        task: { userPrompt: 'Gere 3 blocos de roteiro com foco em benefício principal' }
      });
    };
  </script>
</body>
</html>
```

---

## 16. Checklist de integração

- [ ] Configurar `VITE_API_URL` / `VITE_SOCKET_URL`.
- [ ] Implementar autenticação e gravar token.
- [ ] Criar UI para `send_prompt` com `scriptType`.
- [ ] Mostrar streaming (append) e permitir salvar a versão gerada.
- [ ] Exportar PDF via REST e abrir o URL retornado.

---

Se quiser, eu posso gerar um esqueleto de frontend React/TypeScript com os componentes e hooks já implementados (pré-configurado) — me diga se prefere que eu crie esse scaffold aqui no repositório. Se preferir, também posso gerar o `demo.html` pronto em uma pasta `scripts/` para testes rápidos.
