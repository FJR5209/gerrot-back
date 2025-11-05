# Módulo 6 - Geração de PDF (Assíncrono)

Este módulo implementa a geração de PDFs usando arquitetura assíncrona com filas (BullMQ + Redis).

## Arquitetura

1. **Controller** - Recebe requisição e enfileira tarefa (responde 202 Accepted)
2. **Queue (BullMQ)** - Organiza tarefas de geração
3. **Worker** - Processa PDFs em background
4. **WebSocket** - Notifica quando PDF estiver pronto

## Configuração

### 1. Redis (Opcional para desenvolvimento)

Para desenvolvimento, você pode usar Redis localmente:

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Ou usar Docker
docker run -d -p 6379:6379 redis:alpine
```

Variáveis de ambiente (opcional):
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Nota:** O sistema funciona mesmo sem Redis (com avisos), mas para produção é essencial.

### 2. Dependências

As dependências já estão no `package.json`:
- `bullmq` - Sistema de filas
- `ioredis` - Cliente Redis
- `puppeteer` - Geração de PDFs

Instale com:
```bash
npm install
```

## API

### Solicitar geração de PDF

**POST** `/projects/:projectId/versions/:versionId/export-pdf`

**Resposta (202 Accepted):**
```json
{
  "status": "pending",
  "message": "Seu PDF foi enviado para a fila de geração.",
  "jobId": "job-uuid"
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/projects/uuid-project/versions/uuid-version/export-pdf
```

## Eventos WebSocket

### Frontend recebe: `pdf_ready`

Quando o PDF estiver pronto:

```json
{
  "versionId": "uuid-da-versao",
  "downloadUrl": "http://localhost:3000/pdfs/roteiro-uuid-timestamp.pdf",
  "message": "Seu PDF está pronto para download!"
}
```

**Exemplo de uso no Frontend:**
```javascript
socket.on('pdf_ready', (data) => {
  console.log('PDF pronto!', data.downloadUrl);
  // Atualizar botão "Gerando..." para "Baixar PDF"
  document.getElementById('download-btn').href = data.downloadUrl;
});
```

## Fluxo Completo

1. **Usuário** clica em "Exportar PDF"
2. **Frontend** envia POST para `/projects/:id/versions/:id/export-pdf`
3. **Backend** responde 202 Accepted em < 100ms
4. **Frontend** mostra "Gerando..." e desabilita botão
5. **(Background)** Worker processa PDF:
   - Busca dados do projeto/versão
   - Gera HTML com templates
   - Converte para PDF com Puppeteer
   - Salva em storage
   - Atualiza banco de dados
6. **Backend** envia evento `pdf_ready` via WebSocket
7. **Frontend** recebe evento e mostra botão "Baixar PDF"

## Templates HTML

Os templates estão em `src/modules/6-generation/templates/`:
- `capa.html` - Página de capa do PDF
- `roteiro.html` - Página de conteúdo do roteiro

Variáveis disponíveis nos templates:
- `{{titulo}}` - Título do projeto
- `{{cliente}}` - Nome do cliente
- `{{tipo}}` - Tipo de roteiro
- `{{conteudo}}` - Conteúdo da versão
- `{{versao}}` - Número da versão

## Arquivos Gerados

PDFs são salvos em: `gerrot-backend/pdfs/`
Disponíveis em: `http://localhost:3000/pdfs/{filename}.pdf`

## Notas de Produção

1. **Redis**: Obrigatório em produção para escalabilidade
2. **Storage**: Configure S3/Cloud Storage para PDFs (não use local)
3. **Puppeteer**: Considere usar serviço gerenciado (ex: Browserless)
4. **Worker**: Rode em processo separado ou container dedicado
5. **Monitoring**: Monitore a fila de jobs (BullMQ Dashboard)

## Troubleshooting

**Redis não conecta:**
- Verifique se Redis está rodando: `redis-cli ping`
- Verifique host/port nas variáveis de ambiente

**PDF não é gerado:**
- Verifique logs do worker no console
- Verifique se Puppeteer instalou Chromium corretamente
- Verifique permissões do diretório `pdfs/`

