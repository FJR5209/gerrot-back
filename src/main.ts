import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente com busca robusta do arquivo .env
// Tenta em várias localizações para evitar inconsistências ao rodar de pastas diferentes
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pathUtil = require('path');
const envCandidates = [
  pathUtil.join(process.cwd(), '.env'),
  pathUtil.join(__dirname, '..', '.env'),
  pathUtil.join(__dirname, '../..', '.env'),
];
let loadedEnv = false;
for (const p of envCandidates) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      loadedEnv = true;
      break;
    }
  } catch {
    // ignorar
  }
}
if (!loadedEnv) {
  // Fallback para busca padrão
  dotenv.config();
}

// Controle global de nível de log (default: 'warn' -> mostra apenas warns e errors)
// Ajuste LOG_LEVEL no .env para 'debug' | 'info' | 'warn' | 'error' | 'silent'
const LOG_LEVEL = (process.env.LOG_LEVEL || 'warn').toLowerCase();
const levels: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 };
const currentLevel = levels[LOG_LEVEL] ?? levels.warn;
const noop = () => {};
if (currentLevel > levels.debug) (console as any).debug = noop;
if (currentLevel > levels.info) console.log = noop;
if (currentLevel > levels.warn) console.warn = noop;
if (currentLevel > levels.error) console.error = noop;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const http = require('http');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Server } = require('socket.io');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Redis = require('ioredis');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
import { initializeDatabase, closeDatabase } from './common/database';
import { registerAuthRoutes } from './modules/1-auth/auth.routes';
import { registerUsersRoutes } from './modules/2-users/users.routes';
import { registerClientsRoutes } from './modules/3-clients/clients.routes';
import { registerProjectsRoutes } from './modules/4-projects/projects.routes';
import { registerGenerationRoutes } from './modules/6-generation/generation.routes';
import { AiGateway } from './modules/5-ai/ai.gateway';
import { GenerationWorker } from './modules/6-generation/generation.worker';

async function bootstrap(): Promise<void> {
  // Inicializar banco de dados
  try {
    await initializeDatabase();
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    process.exit(1);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const app = express();
  const server = http.createServer(app);

  // Ajustar trust proxy para respeitar X-Forwarded-* quando atrás de load balancer/proxy
  // Importante em ambientes como Render/Cloudflare para obter IP/TLS corretos
  app.set('trust proxy', true);

  // Configurar timeout do servidor (ms). Use variável de ambiente SERVER_TIMEOUT_MS para ajustar.
  try {
    server.setTimeout(Number(process.env.SERVER_TIMEOUT_MS || '100000'));
  } catch (err) {
    // Ignorar se não suportado
  }

  // Configurar CORS
  const frontendUrl = process.env.FRONTEND_URL || '*';
  const io = new Server(server, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Inicializar Gateway de IA (WebSocket)
  const aiGateway = new AiGateway(io);
  // Info silenciada por padrão

  // Conectar ao Redis (para filas) - Opcional
  let redisConnection: any = null;
  
  // Verificar se Redis está disponível antes de tentar conectar
  const checkRedis = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const testConnection = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
        connectTimeout: 1000, // Timeout rápido
      });

      testConnection.once('connect', () => {
        testConnection.disconnect();
        resolve(true);
      });

      testConnection.once('error', () => {
        testConnection.disconnect();
        resolve(false);
      });

      testConnection.connect().catch(() => resolve(false));
      
      setTimeout(() => {
        testConnection.disconnect();
        resolve(false);
      }, 1500);
    });
  };

  const redisAvailable = await checkRedis();
  
  if (!redisAvailable) {
    console.warn('⚠️  Redis não disponível. Funcionalidades de fila desabilitadas.');
    redisConnection = null;
  } else {
    try {
      redisConnection = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        showFriendlyErrorStack: false,
      });

      redisConnection.on('error', () => {
        // Silencioso
      });
      
      // Testar conexão antes de continuar
      await redisConnection.ping().catch(() => {
        redisConnection = null;
        console.warn('⚠️  Redis não acessível. Funcionalidades de fila desabilitadas.');
      });
    } catch (error) {
      redisConnection = null;
      console.warn('⚠️  Erro ao conectar ao Redis. Funcionalidades de fila desabilitadas.');
    }
  }

  // Inicializar Worker de geração de PDFs
  let generationWorker: GenerationWorker | null = null;
  if (redisConnection) {
    try {
      generationWorker = new GenerationWorker(redisConnection, io);
      // Info silenciada por padrão
    } catch (error: any) {
      console.warn('⚠️  Worker não inicializado (Redis não disponível)');
    }
  } else {
    console.warn('⚠️  Redis não configurado. Worker de PDFs desabilitado.');
  }

  app.use(express.json());

  // Logger de requisições (apenas em modo debug)
  if (currentLevel <= levels.debug) {
    app.use((req: any, _res: any, next: any) => {
      // eslint-disable-next-line no-console
      console.debug(`[req] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // CORS global: responder preflight rapidamente e permitir o frontend configurado
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;
    // Permitir a origem configurada ou localhost em desenvolvimento
    if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    } else if (frontendUrl === '*' || origin === frontendUrl || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Requested-With,Accept,Origin');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Garantir que /health seja sempre público: remover qualquer Authorization
  // que possa estar chegando via proxy ou configuração externa.
  // Isso evita situações onde um proxy injeta um header e faz o guard bloquear o health check.
  app.use((req: any, _res: any, next: any) => {
    try {
      const path = req.path || req.originalUrl || '';
      if (path === '/health' || path.startsWith('/health')) {
        // remover header de autorização para garantir rota pública
        if (req.headers && 'authorization' in req.headers) {
          delete req.headers.authorization;
        }
      }
    } catch (err) {
      // não falhar a inicialização por causa desse middleware
    }
    next();
  });

  // Tratamento de erro de JSON inválido (400 Bad Request)
  // Precisa vir após express.json() e antes das rotas
  app.use((err: any, _req: any, res: any, next: any) => {
    const isJsonParseError = err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err);
    if (isJsonParseError) {
      return res.status(400).json({
        message: 'JSON inválido. Use aspas duplas em chaves e strings, sem vírgulas a mais.',
        details: err?.message || 'Erro ao interpretar JSON',
      });
    }
    next(err);
  });

  // === ROTAS PÚBLICAS PRIMEIRO ===
  // Health check (deve vir ANTES de qualquer guard)
  app.get('/health', (_req: any, res: any) => res.json({ status: 'ok', service: 'gerrot-backend' }));

  // Root público simples para evitar 401 na raiz (útil para frontends que consultam '/').
  // Esta rota é intencionalmente leve e pública — use /health para checagens de serviço mais específicas.
  app.get('/', (_req: any, res: any) =>
    res.json({ status: 'ok', service: 'gerrot-backend', message: 'API pública raiz. Use /health ou /auth' })
  );

  // Servir PDFs estaticamente
  const pdfsDir = path.join(process.cwd(), 'gerrot-backend', 'pdfs');
  app.use('/pdfs', express.static(pdfsDir));

  // Servir Uploads (logos) estaticamente
  const uploadsDir = path.join(process.cwd(), 'gerrot-backend', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Rotas de Autenticação (públicas)
  // Info silenciada por padrão
  registerAuthRoutes(app);

  // Rotas de Generation (ANTES das protegidas para evitar conflito com guards)
  // Info silenciada por padrão
  registerGenerationRoutes(app);

  // Rotas de Users (COM GUARD GLOBAL)
  // Info silenciada por padrão
  registerUsersRoutes(app);

  // Rotas de Clients (COM GUARD GLOBAL)
  // Info silenciada por padrão
  registerClientsRoutes(app);

  // Rotas de Projects (COM GUARD GLOBAL)
  // Info silenciada por padrão
  registerProjectsRoutes(app);
  // Info silenciada por padrão

  server.listen(port, () => {
    // Uma linha essencial de inicialização (warn para aparecer por padrão)
    console.warn(`Servidor iniciado: http://localhost:${port} | WS: ws://localhost:${port} | PDFs: /pdfs`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.warn('Encerrando servidor...');
    try {
      if (generationWorker) {
        await generationWorker.close();
      }
    } catch (err) {
      console.warn('Erro ao fechar generationWorker (ignorado):', (err as any)?.message || err);
    }

    if (redisConnection) {
      try {
        await redisConnection.quit();
      } catch (error) {
        // Ignorar erros ao fechar Redis
      }
    }

    try {
      await closeDatabase();
    } catch (err) {
      console.warn('Erro ao fechar conexão com DB (ignorado):', (err as any)?.message || err);
    }

    try {
      server.close();
    } catch (err) {
      // Ignorar
    }

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Erro ao iniciar a aplicação:', err);
  process.exit(1);
});
