import { Response } from 'express';
import { ScriptVersionsService } from './script-versions.service';
import { ProjectsService } from './projects.service';
import { AiService } from '../5-ai/ai.service';
import { CreateScriptVersionDto } from '../../common/dto/create-script-version.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

export class ScriptVersionsController {
  private readonly service = new ScriptVersionsService();
  private readonly projectsService = new ProjectsService();
  private readonly aiService = new AiService();

  /**
   * POST /projects/:projectId/versions
   * Cria uma nova versão de roteiro
   */
  public create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      const dto = plainToClass(CreateScriptVersionDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      let contentToSave: string | undefined = dto.content;

      // Se solicitada geração automática, chamar o AiService
      if (dto.autoGenerate) {
        // Buscar projeto para contexto (e validar existência)
        const project = await this.projectsService.findOne(projectId);
        if (!project) {
          return res.status(404).json({ message: 'Projeto não encontrado para geração automática' });
        }

        // Construir prompt a partir da descrição e informações do projeto
        const promptParts: string[] = [];
        promptParts.push(dto.description || '');
        promptParts.push(`Título do projeto: ${project.title}`);
        if (project.client && (project.client as any).name) {
          promptParts.push(`Cliente: ${(project.client as any).name}`);
        }

        const promptText = promptParts.filter(Boolean).join('\n\n');

        // Gerar conteúdo via AiService
        try {
          const generated = await this.aiService.generate({ projectId, prompt: promptText, fullContext: '', settings: dto.settings || {} });
          contentToSave = String(generated || '').trim();
        } catch (err: any) {
          console.error('Erro ao gerar conteúdo via IA:', err);
          return res.status(500).json({ message: 'Erro ao gerar conteúdo via IA', details: (err as any)?.message || err });
        }
      }

      if (!contentToSave) {
        return res.status(400).json({ message: 'Conteúdo ausente para criar versão' });
      }

      const version = await this.service.create(projectId, contentToSave);

      res.status(201).json(version);
    } catch (error: any) {
      console.error('Erro ao criar versão:', error);
      const statusCode = error.message?.includes('não encontrado') ? 404 : 400;
      res.status(statusCode).json({ message: error.message || 'Erro ao criar versão' });
    }
  };

  /**
   * GET /projects/:projectId/versions
   * Lista todas as versões de um projeto
   */
  public list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      console.log('📋 LIST VERSIONS - Request recebido');
      console.log('   Project ID:', projectId);
      
      const versions = await this.service.findByProject(projectId);
      
      console.log(`✅ Versões encontradas: ${versions.length}`);
      versions.forEach((v, idx) => {
        console.log(`   ${idx + 1}. ID: ${v.id}, Versão: ${v.versionNumber}, Conteúdo: ${v.content.substring(0, 50)}...`);
      });
      
      res.json(versions);
    } catch (error: any) {
      console.error('❌ Erro ao listar versões:', error);
      res.status(500).json({ message: error.message || 'Erro ao listar versões' });
    }
  };

  /**
   * GET /projects/:projectId/versions/:versionId
   * Busca uma versão específica
   */
  public getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      const version = await this.service.findOne(versionId);

      if (!version) {
        res.status(404).json({ message: 'Versão não encontrada' });
        return;
      }

      res.json(version);
    } catch (error: any) {
      console.error('Erro ao buscar versão:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  /**
   * PATCH /projects/:projectId/versions/:versionId
   * Atualiza o conteúdo de uma versão
   */
  public update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      
      console.log('📝 UPDATE VERSION - Request recebido');
      console.log('   Version ID:', versionId);
      console.log('   Body:', JSON.stringify(req.body, null, 2));
      
      const dto = plainToClass(CreateScriptVersionDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        console.error('❌ Erros de validação:', errorMessages);
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      if (dto.content === undefined || dto.content === null || dto.content === '') {
        console.error('❌ Conteúdo ausente ou vazio');
        return res.status(400).json({ message: 'Conteúdo é obrigatório para atualização' });
      }

      console.log('   Conteúdo a salvar (primeiros 200 chars):', dto.content.substring(0, 200));

      const updated = await this.service.update(versionId, dto.content);

      if (!updated) {
        console.error('❌ Versão não encontrada');
        res.status(404).json({ message: 'Versão não encontrada' });
        return;
      }

      console.log('✅ Versão atualizada com sucesso');
      res.json(updated);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar versão:', error);
      res.status(400).json({ message: error.message || 'Erro ao atualizar versão' });
    }
  };

  /**
   * DELETE /projects/:projectId/versions/:versionId
   * Remove uma versão
   */
  public remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { versionId } = req.params;
      const ok = await this.service.remove(versionId);

      if (!ok) {
        res.status(404).json({ message: 'Versão não encontrada' });
        return;
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao remover versão:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}

