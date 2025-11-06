import 'reflect-metadata';
import * as dotenv from 'dotenv';
// Carregar .env (padrão)
dotenv.config();

// Reusar inicialização mínima do banco
import { initializeDatabase, closeDatabase } from './common/database';
import { GenerationWorker } from './modules/6-generation/generation.worker';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Redis = require('ioredis');

async function bootstrap(): Promise<void> {
  try {
    await initializeDatabase();
  } catch (error: any) {
    console.error('❌ Erro ao conectar ao banco de dados:', error?.message || error);
    process.exit(1);
  }

  // Inicializar conexão Redis (aceita REDIS_URL ou host/port)
  let redisConnection: any = null;
  try {
    if (process.env.REDIS_URL) {
      redisConnection = new Redis(process.env.REDIS_URL);
    } else if (process.env.REDIS_HOST) {
      redisConnection = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
      });
    }
    if (!redisConnection) {
      console.warn('⚠️  Redis não configurado. Worker de PDFs não iniciado.');
      await closeDatabase();
      process.exit(0);
    }

    // Testar ping
    await redisConnection.ping();
  } catch (err) {
    console.warn('⚠️  Não foi possível conectar ao Redis. Worker de PDFs não iniciado.');
    try {
      await closeDatabase();
    } catch {}
    process.exit(0);
  }

  // Criar e manter o worker em execução
  try {
    const generationWorker = new GenerationWorker(redisConnection);

    const shutdown = async () => {
      console.warn('Encerrando worker...');
      try {
        await generationWorker.close();
      } catch (_e) {}
      try {
        await redisConnection.quit();
      } catch (_e) {}
      try {
        await closeDatabase();
      } catch (_e) {}
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Evitar que o processo termine
    console.warn('Worker de geração rodando. Aguardando jobs...');
  } catch (error: any) {
    console.error('Erro ao iniciar o worker:', error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Erro ao iniciar worker:', err);
  process.exit(1);
});
