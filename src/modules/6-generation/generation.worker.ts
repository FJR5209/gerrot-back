import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PdfGenerator } from './pdf-generator.service';
import { ProjectsService } from '../4-projects/projects.service';
import { ScriptVersionsService } from '../4-projects/script-versions.service';

// <--- CORREÇÃO 1: Importar o Server do socket.io COM UM "APELIDO"
import { Server as SocketIOServer } from 'socket.io';

export interface PdfGenerationJobData {
  projectId: string;
  versionId: string;
  userId: string;
}

export class GenerationWorker {
  private worker: Worker<PdfGenerationJobData>;
  private pdfGenerator: PdfGenerator;
  private projectsService: ProjectsService;
  private versionsService: ScriptVersionsService;

  // <--- CORREÇÃO 2: Tipar a propriedade 'io' com o APELIDO e permitir 'null'
  private io: SocketIOServer | null;

  // <--- CORREÇÃO 3: Tipar o parâmetro 'io' no construtor com o APELIDO
  constructor(redisConnection: Redis, io?: SocketIOServer) {
    this.pdfGenerator = new PdfGenerator();
    this.projectsService = new ProjectsService();
    this.versionsService = new ScriptVersionsService();

    // <--- CORREÇÃO 4: Atribuir 'io' (que pode ser undefined) ou 'null'
    this.io = io || null;

    // Criar worker que processa a fila
    this.worker = new Worker<PdfGenerationJobData>(
      'pdf-generation',
      async (job: Job<PdfGenerationJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 2, // Processar 2 PDFs simultaneamente
      }
    );

    // Event handlers
    this.worker.on('completed', (job) => {
      console.log(`✅ PDF gerado com sucesso: Job ${job.id}`);
      this.notifyUser(job);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Erro ao gerar PDF: Job ${job?.id}`, err);
    });

    console.log('👷 Worker de geração de PDFs iniciado');
  }

  /**
   * Processa um job de geração de PDF
   */
  private async processJob(job: Job<PdfGenerationJobData>): Promise<string> {
    const { projectId, versionId } = job.data;

    console.log(`🔄 Processando PDF para versão ${versionId}...`);

    try {
      // Atualizar progresso
      await job.updateProgress(10);

      // 1. Buscar dados: Project, ScriptVersion, Client
      const project = await this.projectsService.findOne(projectId);
      if (!project) {
        throw new Error('Projeto não encontrado');
      }

      // Buscar versão real do banco
      const version = await this.versionsService.findOne(versionId);
      if (!version) {
        throw new Error('Versão não encontrada');
      }

      await job.updateProgress(30);

      // 2. Gerar HTML com os dados reais
      const html = await this.pdfGenerator.generateHTML({
        project,
        version: {
          id: version.id,
          content: version.content,
          versionNumber: version.versionNumber,
        },
        client: project.client as any,
      });

      await job.updateProgress(50);

      // 3. Gerar PDF com Puppeteer
      const pdfBuffer = await this.pdfGenerator.generatePDF(html);

      await job.updateProgress(70);

      // 4. Fazer upload para storage
      const pdfUrl = await this.pdfGenerator.uploadPDF(pdfBuffer, versionId);

      // 5. Atualizar versão com URL do PDF gerado
      await this.versionsService.updatePdfUrl(versionId, pdfUrl);

      await job.updateProgress(90);

      await job.updateProgress(100);

      return pdfUrl;
    } catch (error: any) {
      console.error(`Erro ao processar job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Notifica o usuário via WebSocket quando o PDF estiver pronto
   */
  private async notifyUser(job: Job<PdfGenerationJobData>): Promise<void> {
    // <--- CORREÇÃO 5: Esta verificação informa ao TypeScript que 'this.io' não é 'null'
    if (!this.io) {
      console.warn('⚠️  WebSocket não disponível para notificação');
      return;
    }

    const { versionId, userId } = job.data;
    const downloadUrl = job.returnvalue;

    // Type assertion necessário para TypeScript reconhecer o método 'to'
    // @ts-ignore - Socket.IO Server type issue
    this.io.to(`user:${userId}`).emit('pdf_ready', {
      versionId,
      downloadUrl,
      message: 'Seu PDF está pronto para download!',
    });

    console.log(`📢 Notificação enviada para usuário ${userId}: PDF pronto`);
  }

  /**
   * Fechar o worker
   */
  public async close(): Promise<void> {
    await this.worker.close();
  }
}