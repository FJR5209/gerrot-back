import express from 'express';
import { ProjectsController } from './projects.controller';
import { ScriptVersionsController } from './script-versions.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

export function registerProjectsRoutes(app: any): void {
  const router = express.Router();
  const controller = new ProjectsController();
  const versionsController = new ScriptVersionsController();
  const jwtGuard = new JwtAuthGuard();

  // Todas as rotas de projetos requerem autenticação
  router.use(jwtGuard.canActivate());

  // ===== ROTAS DE PROJETOS =====
  
  // 1) Criar um novo projeto
  router.post('/projects', controller.create);

  // 2) Listar todos os projetos
  router.get('/projects', controller.list);

  // 2.1) Visualização de calendário (filtro por período de datas)
  router.get('/projects/calendar', controller.calendar);

  // 2.2) Visualização de agenda (filtros: upcoming, overdue, this-week, next-week)
  router.get('/projects/agenda', controller.agenda);

  // 3) Obter detalhes de um projeto específico
  router.get('/projects/:id', controller.getById);

  // 4) Atualizar um projeto
  router.patch('/projects/:id', controller.update);

  // 5) Deletar um projeto
  router.delete('/projects/:id', controller.remove);

  // ===== ROTAS DE VERSÕES DE ROTEIRO =====
  
  // 6) Criar uma nova versão de roteiro para um projeto
  router.post('/projects/:projectId/versions', versionsController.create);

  // 7) Listar todas as versões de um projeto
  router.get('/projects/:projectId/versions', versionsController.list);

  // 8) Obter uma versão específica
  router.get('/projects/:projectId/versions/:versionId', versionsController.getById);

  // 9) Atualizar o conteúdo de uma versão
  router.patch('/projects/:projectId/versions/:versionId', versionsController.update);

  // 10) Deletar uma versão
  router.delete('/projects/:projectId/versions/:versionId', versionsController.remove);

  app.use(router);
}

