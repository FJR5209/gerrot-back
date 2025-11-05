# Rotas da API (GERROT Backend)

Base URL: `http://localhost:${PORT}` (padrão: `3000`)

- Health check: `GET /health` (público)
- Arquivos estáticos:
  - PDFs: `GET /pdfs/*` (público)
  - Uploads (logos): `GET /uploads/*` (público)
- Autenticação JWT: rotas de Clients, Projects e Versions exigem header `Authorization: Bearer <token>`

## Autenticação (`/auth`) — Público

| Método | Caminho           | Auth | Descrição                                 |
|-------:|-------------------|:----:|-------------------------------------------|
| POST   | /auth/register    |  -   | Registrar novo usuário                     |
| POST   | /auth/login       |  -   | Fazer login e receber token JWT            |

Payloads:
- POST /auth/register: `{ email, name, password }`
- POST /auth/login: `{ email, password }`

## Health e Estáticos — Público

| Método | Caminho   | Auth | Descrição                     |
|-------:|-----------|:----:|-------------------------------|
| GET    | /health   |  -   | Verificar status do serviço    |
| GET    | /pdfs/*   |  -   | Servir PDFs gerados            |
| GET    | /uploads/*|  -   | Servir arquivos de upload      |

## Clientes (`/clients`) — Requer JWT

| Método | Caminho              | Auth | Descrição                                        |
|-------:|----------------------|:----:|--------------------------------------------------|
| GET    | /clients             | ✅   | Listar clientes                                  |
| POST   | /clients             | ✅   | Criar cliente                                    |
| GET    | /clients/:id         | ✅   | Obter cliente por ID                             |
| PATCH  | /clients/:id         | ✅   | Atualizar cliente                                 |
| DELETE | /clients/:id         | ✅   | Remover cliente                                   |
| PATCH  | /clients/:id/logo    | ✅   | Upload/alterar logo (multipart/form-data: `file`) |

Observações:
- Uploads de logo ficam acessíveis em `/uploads/*`.

## Projetos (`/projects`) — Requer JWT

| Método | Caminho                   | Auth | Descrição                             |
|-------:|---------------------------|:----:|---------------------------------------|
| POST   | /projects                 | ✅   | Criar projeto                         |
| GET    | /projects                 | ✅   | Listar projetos                       |
| GET    | /projects/:id             | ✅   | Obter projeto por ID                  |
| PATCH  | /projects/:id             | ✅   | Atualizar projeto                     |
| DELETE | /projects/:id             | ✅   | Remover projeto                       |

Payloads (exemplos):
- POST /projects: `{ title, scriptType: "social_media"|"internal"|"tv_commercial", clientId }`
- PATCH /projects/:id: `{ title?, scriptType? }`

## Versões de Roteiro (`/projects/:projectId/versions`) — Requer JWT

| Método | Caminho                                             | Auth | Descrição                                |
|-------:|-----------------------------------------------------|:----:|------------------------------------------|
| POST   | /projects/:projectId/versions                       | ✅   | Criar nova versão de roteiro             |
| GET    | /projects/:projectId/versions                       | ✅   | Listar versões de um projeto             |
| GET    | /projects/:projectId/versions/:versionId            | ✅   | Obter versão específica                  |
| PATCH  | /projects/:projectId/versions/:versionId            | ✅   | Atualizar conteúdo da versão             |
| DELETE | /projects/:projectId/versions/:versionId            | ✅   | Remover versão                           |

## Geração de PDF — Público (no código atual)

| Método | Caminho                                                  | Auth | Descrição                                                                                              |
|-------:|----------------------------------------------------------|:----:|--------------------------------------------------------------------------------------------------------|
| POST   | /projects/:projectId/versions/:versionId/export-pdf      |  -   | Solicitar geração de PDF; usa fila (202 Accepted) se Redis disponível; senão gera síncrono (200 OK).   |

Respostas típicas:
- 202 Accepted (fila): `{ status: "pending", message, jobId }`
- 200 OK (síncrono): `{ status: "completed", message, downloadUrl }`
- 4xx/5xx com mensagem de erro detalhada

## WebSocket (Socket.IO)

- URL: `ws://localhost:${PORT}` (padrão: `3000`)
- CORS: `FRONTEND_URL` controla origem permitida (fallback: `*`)
- Salas:
  - `project:<projectId>` — conexão após `join_project`

Eventos (cliente ⇆ servidor):

| Direção | Evento          | Payload de entrada                                    | Resposta/Eventos                      | Descrição |
|:-------:|-----------------|--------------------------------------------------------|---------------------------------------|-----------|
| →       | join_project    | `{ projectId }`                                        | `joined_project` ou `error`           | Entrar na sala do projeto |
| ←       | joined_project  | `{ projectId, message }`                               | —                                     | Confirmação de entrada |
| →       | send_prompt     | `{ projectId?, context, task: { currentScriptContent?, userPrompt } }` | `ai_started`, `ai_chunk`, `ai_finished`, `ai_error` | Enviar prompt para geração |
| ←       | ai_started      | `{ message }`                                          | —                                     | Início do processamento |
| ←       | ai_chunk        | `{ textChunk }`                                        | —                                     | Streaming de resposta |
| ←       | ai_finished     | `{ fullResponse, message }`                            | —                                     | Fim do processamento |
| ←       | ai_error        | `{ message }`                                          | —                                     | Erro na geração |

Notas:
- Atualmente, não há autenticação por JWT no WebSocket (planejado: associar ao usuário e salas `user:<userId>`).

---

Referências úteis:
- Exemplos de requisição: `gerrot-backend/test-requests.http`
- README com visão geral: `gerrot-backend/README.md`
