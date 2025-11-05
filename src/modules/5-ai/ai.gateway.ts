import { Server as SocketIOServer, Socket } from 'socket.io';
import { AiService, PromptData } from './ai.service';
import { ProjectsService } from '../4-projects/projects.service';
import * as fs from 'fs';
import * as path from 'path';

interface SocketWithProject extends Socket {
  projectId?: string;
}

export class AiGateway {
  private io: SocketIOServer;
  private aiService: AiService;
  private projectsService: ProjectsService;
  private projectConnections: Map<string, Set<string>> = new Map(); // projectId -> Set de socketIds

  constructor(io: SocketIOServer) {
    this.io = io;
    this.aiService = new AiService();
    this.projectsService = new ProjectsService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Evento: Cliente se inscreve em um projeto (join_room)
      socket.on('join_project', async (data: { projectId: string }) => {
        const { projectId } = data;

        // Validar se o projeto existe
        const project = await this.projectsService.findOne(projectId);
        if (!project) {
          socket.emit('error', {
            message: 'Projeto não encontrado',
          });
          return;
        }

        // Registrar a conexão
        (socket as SocketWithProject).projectId = projectId;
        socket.join(`project:${projectId}`);

        // Manter registro de quem está conectado em cada projeto
        if (!this.projectConnections.has(projectId)) {
          this.projectConnections.set(projectId, new Set());
        }
        this.projectConnections.get(projectId)!.add(socket.id);

        console.log(`📝 Cliente ${socket.id} entrou no projeto ${projectId}`);

        socket.emit('joined_project', {
          projectId,
          message: 'Conectado ao projeto com sucesso',
        });
      });

      // Evento 1: Frontend envia um prompt (send_prompt)
      socket.on('send_prompt', async (data: any) => {
        // Espera payload com a estrutura definida no frontend (context + task)
        const socketWithProject = socket as SocketWithProject;
        const projectId = socketWithProject.projectId || data.projectId || (data && data.projectId);

        if (!projectId) {
          socket.emit('ai_error', { message: 'ProjectId não fornecido. Conecte-se ao projeto primeiro.' });
          return;
        }

        // Validar se o projeto existe
        const project = await this.projectsService.findOne(projectId);
        if (!project) {
          socket.emit('ai_error', { message: 'Projeto não encontrado' });
          return;
        }

        // Extrair context e task do payload
        const context = (data && data.context) || {};
        const task = (data && data.task) || {};

        // Montar o prompt em 4 camadas conforme a engenharia de prompt
        // Camada 2: carregar template baseado em context.scriptType
        const scriptType: string = (context.scriptType || (project as any).scriptType || 'social_media').toString();
        let template = '';
        let templateName = '';
        try {
          const mapping: Record<string, string> = {
            social_media: 'social_media.txt',
            tv_commercial: 'vt.txt',
            tv: 'vt.txt',
            internal: 'internal.txt',
          };
          templateName = mapping[scriptType] || 'social_media.txt';
          const templatePath = path.join(__dirname, 'templates', templateName);
          if (fs.existsSync(templatePath)) {
            template = fs.readFileSync(templatePath, 'utf8');
          }
        } catch (err) {
          console.warn('[AiGateway] não foi possível carregar template, seguindo sem template');
          template = '';
        }

        // Camada 3: preencher placeholders do template com valores de context/projeto
        const placeholders: Record<string, string> = {
          titulo: project.title || '',
          objetivo: context.objetivo || project.title || '',
          publicoAlvo: context.publicoAlvo || '',
          duracao: context.duracao || '',
        };
        let filledTemplate = template;
        Object.entries(placeholders).forEach(([k, v]) => {
          const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
          filledTemplate = filledTemplate.replace(re, v);
        });

        // Camada 4: instrução final combinando currentScriptContent e userPrompt
        const currentScript = task.currentScriptContent || '';
        const userPrompt = task.userPrompt || '';

        const finalPrompt = [filledTemplate, '\n\nContexto adicional:', JSON.stringify(context), '\n\nRoteiro atual:', currentScript, '\n\nInstrução do usuário:', userPrompt].filter(Boolean).join('\n\n');

        console.log(`💬 Prompt recebido (WS) para projeto ${projectId}: ${userPrompt.substring(0, 120)}...`);

        // Enviar evento de início
        socket.emit('ai_started', { message: 'Processando sua solicitação...' });

        // Preparar PromptData e chamar o serviço com streaming
        const promptData: PromptData = {
          projectId,
          prompt: finalPrompt,
          fullContext: currentScript || '',
          // garantir que o AiService receba o scriptType/templateName explicitamente
          settings: { ...(context || {}), scriptType, templateName },
        } as PromptData;

        await this.aiService.generateStreaming(promptData, {
          onChunk: (chunk: string) => {
            socket.emit('ai_chunk', { textChunk: chunk });
          },
          onFinished: (fullResponse: string) => {
            socket.emit('ai_finished', { fullResponse, message: 'Geração concluída' });
            console.log(`✅ Resposta completa gerada para projeto ${projectId}`);
          },
          onError: (error: Error) => {
            socket.emit('ai_error', { message: error.message || 'Erro ao processar solicitação da IA' });
            console.error(`❌ Erro ao gerar resposta: ${error.message}`);
          },
        });
      });

      // Evento: Desconexão
      socket.on('disconnect', () => {
        const socketWithProject = socket as SocketWithProject;
        const projectId = socketWithProject.projectId;

        if (projectId) {
          const connections = this.projectConnections.get(projectId);
          if (connections) {
            connections.delete(socket.id);
            if (connections.size === 0) {
              this.projectConnections.delete(projectId);
            }
          }
        }

        console.log(`🔌 Cliente desconectado: ${socket.id}`);
      });
    });
  }

  /**
   * Método público para obter o servidor Socket.IO (útil para configuração)
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
