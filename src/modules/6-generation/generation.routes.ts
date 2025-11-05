import express from 'express';
import { GenerationController } from './generation.controller';

export function registerGenerationRoutes(app: any): void {
  const router = express.Router();
  const controller = new GenerationController();

  console.log('📋 Registrando rotas de geração de PDF...');

  // Exportar PDF de uma versão específica
  // POST e GET - permite download direto ou solicitação assíncrona
  router.post(
    '/projects/:projectId/versions/:versionId/export-pdf',
    controller.exportPdf
  );

  router.get(
    '/projects/:projectId/versions/:versionId/export-pdf',
    controller.exportPdf
  );

  app.use(router);
  console.log('✅ Rotas de geração registradas com sucesso');
}

