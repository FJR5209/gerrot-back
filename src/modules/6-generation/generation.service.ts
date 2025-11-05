import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface PdfGenerationJob {
  projectId: string;
  versionId: string;
  userId: string;
}

export class GenerationService {
  private queue: Queue<PdfGenerationJob> | null = null;

  constructor() {
    // Lazy initialization - só tenta conectar quando realmente necessário
    // Isso evita tentativas de conexão desnecessárias
    this.queue = null;
  }

  private async ensureQueue(): Promise<void> {
    if (this.queue) {
      return;
    }

    try {
      // Conectar ao Redis (ou usar Redis local). Suporta REDIS_URL e REDIS_PASSWORD.
      const tlsEnabled = (process.env.REDIS_TLS || 'false').toLowerCase() === 'true';

      let connection: any;
      if (process.env.REDIS_URL) {
        // Tipagem do ioredis pode não aceitar (url, opts) dependendo das d.ts instaladas;
        // usamos apenas a URL para compatibilidade com Upstash. Se precisar de opções
        // extras, prefira usar host/port/password em vez de REDIS_URL.
        connection = new Redis(process.env.REDIS_URL as any);
      } else {
        const connectionOptions: any = {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          lazyConnect: true,
          showFriendlyErrorStack: false,
          connectTimeout: 2000,
        };

        connectionOptions.retryStrategy = () => null;
        if (tlsEnabled) connectionOptions.tls = {};

        connection = new Redis(connectionOptions);
      }

      // Suprimir todos os erros de conexão
      (connection as any).on('error', () => {
        // Silencioso
      });

      // Criar fila de geração de PDFs
      this.queue = new Queue('pdf-generation', {
        connection,
      });

      // Suprimir erros da fila também
      (this.queue as any).on('error', () => {
        // Silencioso
      });

      // Tentar ping para validar conexão
      try {
        await (connection as any).ping();
        console.log('📋 Fila de geração de PDFs inicializada');
      } catch (error) {
        // Se ping falhar, marcar queue como null
        this.queue = null;
        (connection as any).disconnect();
      }
    } catch (error) {
      this.queue = null;
    }
  }

  /**
   * Adiciona uma tarefa à fila de geração de PDFs
   */
  public async enqueuePdfGeneration(data: PdfGenerationJob): Promise<string> {
    await this.ensureQueue();
    
    if (!this.queue) {
      throw new Error('Fila de PDFs não disponível. Redis não está configurado.');
    }

    const job = await this.queue.add('generate-pdf', data, {
      attempts: 3, // Tentar até 3 vezes em caso de erro
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    console.log(`📝 PDF enfileirado: Job ${job.id} para versão ${data.versionId}`);

    return job.id!;
  }

  /**
   * Obtém o status de um job
   */
  public async getJobStatus(jobId: string) {
    await this.ensureQueue();
    
    if (!this.queue) {
      return null;
    }

    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Obtém a instância da fila (para o worker)
   */
  public getQueue(): Queue<PdfGenerationJob> | null {
    return this.queue;
  }
}
