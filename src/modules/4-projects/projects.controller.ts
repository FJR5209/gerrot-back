import { Response } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from '../../common/dto/create-project.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

export class ProjectsController {
  private readonly service = new ProjectsService();

  /**
   * SEGURANÇA: Remove campos sensíveis de um objeto User
   */
  private sanitizeUser(user: any): any {
    if (!user) return null;
    
    // Criar novo objeto apenas com campos seguros
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      logoUrl: user.logoUrl || null,
      createdAt: user.createdAt,
    };
  }

  /**
   * SEGURANÇA: Sanitiza projeto removendo campos sensíveis do owner
   */
  private sanitizeProject(project: any): any {
    if (!project) return project;
    
    // Criar novo objeto sem referências ao original
    const sanitized = JSON.parse(JSON.stringify(project));
    
    // Substituir owner por versão sanitizada
    if (sanitized.owner) {
      sanitized.owner = this.sanitizeUser(project.owner);
    }
    
    return sanitized;
  }

  public create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const dto = plainToClass(CreateProjectDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      const project = await this.service.create({
        title: dto.title,
        scriptType: dto.scriptType,
        clientId: dto.clientId,
        ownerId: req.user.userId,
        recordingDate: dto.recordingDate,
        deliveryDeadline: dto.deliveryDeadline,
        estimatedDuration: dto.estimatedDuration,
        location: dto.location,
        notes: dto.notes,
      });

      // Garantir que clientId está na resposta (importante para MongoDB)
      const response = {
        ...project,
        clientId: project.clientId || (project as any).clientId,
        ownerId: project.ownerId || (project as any).ownerId,
      };

      // SEGURANÇA: Sanitizar antes de enviar
      res.status(201).json(this.sanitizeProject(response));
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error);
      const statusCode = error.message?.includes('não encontrado') ? 404 : 400;
      res.status(statusCode).json({ message: error.message || 'Erro ao criar projeto' });
    }
  };

  public list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Listar TODOS os projetos (sem filtrar por ownerId)
      // Qualquer usuário autenticado pode ver todos os projetos
      const projects = await this.service.findAll();
      
      // SEGURANÇA: Sanitizar todos os projetos antes de enviar
      const safeProjects = projects.map(p => this.sanitizeProject(p));
      res.json(safeProjects);
    } catch (error: any) {
      console.error('Erro ao listar projetos:', error);
      res.status(500).json({ message: error.message || 'Erro ao listar projetos' });
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const project = await this.service.findOne(id);
      if (!project) {
        res.status(404).json({ message: 'Projeto não encontrado' });
        return;
      }
      
      // SEGURANÇA: Sanitizar antes de enviar
      res.json(this.sanitizeProject(project));
    } catch (error: any) {
      console.error('Erro ao buscar projeto:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  public update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto = plainToClass(CreateProjectDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      const updateData: any = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.scriptType !== undefined) updateData.scriptType = dto.scriptType;
      if (dto.recordingDate !== undefined) updateData.recordingDate = dto.recordingDate;
      if (dto.deliveryDeadline !== undefined) updateData.deliveryDeadline = dto.deliveryDeadline;
      if (dto.estimatedDuration !== undefined) updateData.estimatedDuration = dto.estimatedDuration;
      if (dto.location !== undefined) updateData.location = dto.location;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      // Capturar informações do usuário que está modificando
      const modifiedBy = req.user ? {
        userId: req.user.userId,
        userName: (req.user as any).name || req.user.email || 'Usuário'
      } : undefined;

      const updated = await this.service.update(id, updateData, modifiedBy);
      if (!updated) {
        res.status(404).json({ message: 'Projeto não encontrado' });
        return;
      }
      
      // SEGURANÇA: Sanitizar antes de enviar
      res.json(this.sanitizeProject(updated));
    } catch (error: any) {
      console.error('Erro ao atualizar projeto:', error);
      res.status(400).json({ message: error.message || 'Erro ao atualizar projeto' });
    }
  };

  public remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const ok = await this.service.remove(id);
      if (!ok) {
        res.status(404).json({ message: 'Projeto não encontrado' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao remover projeto:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /projects/calendar?start=2025-11-01&end=2025-11-30
   * Retorna projetos filtrados por período de datas (gravação ou entrega)
   */
  public calendar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        res.status(400).json({ message: 'Parâmetros start e end são obrigatórios (formato: YYYY-MM-DD)' });
        return;
      }

      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ message: 'Datas inválidas' });
        return;
      }

      const projects = await this.service.findByDateRange(startDate, endDate);
      const safeProjects = projects.map(p => this.sanitizeProject(p));
      
      res.json(safeProjects);
    } catch (error: any) {
      console.error('Erro ao buscar projetos por período:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  /**
   * GET /projects/agenda?filter=upcoming|overdue|this-week|next-week
   * Retorna projetos agrupados e ordenados cronologicamente para visão de agenda
   */
  public agenda = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { filter } = req.query;
      
      let projects: any[] = [];
      
      switch (filter) {
        case 'upcoming':
          projects = await this.service.findUpcoming();
          break;
        case 'overdue':
          projects = await this.service.findOverdue();
          break;
        case 'this-week':
          projects = await this.service.findThisWeek();
          break;
        case 'next-week':
          projects = await this.service.findNextWeek();
          break;
        default:
          // Sem filtro: retorna próximos 30 dias
          const today = new Date();
          const in30Days = new Date();
          in30Days.setDate(today.getDate() + 30);
          projects = await this.service.findByDateRange(today, in30Days);
      }

      const safeProjects = projects.map(p => this.sanitizeProject(p));
      
      // Agrupar por data para facilitar renderização em grid
      const grouped = safeProjects.reduce((acc: any, project: any) => {
        const dateKey = project.recordingDate 
          ? new Date(project.recordingDate).toISOString().split('T')[0]
          : 'sem-data';
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(project);
        return acc;
      }, {});

      res.json({
        projects: safeProjects,
        grouped,
        total: safeProjects.length,
      });
    } catch (error: any) {
      console.error('Erro ao buscar agenda:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}
