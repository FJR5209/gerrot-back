import { GenerationService } from './generation.service';
import { PdfGenerator } from './pdf-generator.service';
import { ProjectsService } from '../4-projects/projects.service';
import { ScriptVersionsService } from '../4-projects/script-versions.service';
import { Logger } from '@nestjs/common';

export class GenerationController {
  private readonly logger = new Logger(GenerationController.name);
  private readonly service = new GenerationService();
  private readonly pdfGenerator = new PdfGenerator();
  private readonly projectsService = new ProjectsService();
  private readonly versionsService = new ScriptVersionsService();

  /**
   * Solicita a geração de um PDF para uma versão específica
   * POST /projects/:projectId/versions/:versionId/export-pdf
   * Se Redis não estiver disponível, gera o PDF diretamente (modo síncrono)
   */
  public exportPdf = async (req: any, res: any) => {
    this.logger.log('[GenerationController] exportPdf request body:' + JSON.stringify(req.params || req.body || {}, null, 2));
    
    // Configurar CORS para permitir acesso do frontend
    const frontendUrl = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    try {
      const { projectId, versionId } = req.params;

      if (!projectId || !versionId) {
        return res.status(400).json({
          message: 'projectId e versionId são obrigatórios',
        });
      }

      // Tentar usar fila com Redis (modo assíncrono)
      try {
        const jobId = await this.service.enqueuePdfGeneration({
          projectId,
          versionId,
          userId: req.user?.userId || 'default-user-id',
        });

        // Se chegou aqui, Redis está disponível e job foi enfileirado
        return res.status(202).json({
          status: 'pending',
          message: 'Seu PDF foi enviado para a fila de geração.',
          jobId,
        });
      } catch (error: any) {
        // Se Redis não estiver disponível, gerar PDF diretamente (modo síncrono)
        if (error.message?.includes('Redis') || error.message?.includes('Fila')) {
          this.logger.warn('⚠️  Redis não disponível. Gerando PDF diretamente (modo síncrono)...');

          // Buscar dados do projeto e versão
          const project = await this.projectsService.findOne(projectId);
          if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado' });
          }

            // Verificar se client foi carregado
            if (!project.client) {
              console.error('❌ Cliente não foi carregado no projeto');
              console.error('   Detalhes:', {
                projectId: project.id,
                projectTitle: project.title,
                hasClientId: !!project.clientId,
                clientId: project.clientId || (project as any).clientId,
              });
              
              // Mensagem mais específica baseada no problema
              let errorMessage = 'Erro: Cliente não encontrado no projeto. ';
              if (!project.clientId && !(project as any).clientId) {
                errorMessage += 'Este projeto foi criado antes da atualização do sistema e não tem clientId salvo. ';
                errorMessage += 'Por favor, crie um novo projeto usando o endpoint POST /projects.';
              } else {
                errorMessage += 'O clientId foi encontrado mas o cliente não pôde ser carregado.';
              }
              
              return res.status(500).json({ 
                message: errorMessage,
                projectId: project.id,
                clientId: project.clientId || (project as any).clientId || null,
              });
            }

          const version = await this.versionsService.findOne(versionId);
          if (!version) {
            return res.status(404).json({ message: 'Versão não encontrada' });
          }

              this.logger.log('✅ Dados carregados: ' + JSON.stringify({
            projectId: project.id,
            projectTitle: project.title,
            clientId: (project.client as any)?.id,
            clientName: (project.client as any)?.name,
            versionId: version.id,
            versionNumber: version.versionNumber,
          }, null, 2));

          // Gerar HTML
          const html = await this.pdfGenerator.generateHTML({
            project,
            version: {
              id: version.id,
              content: version.content,
              versionNumber: version.versionNumber,
            },
            client: project.client as any,
          });

          // Gerar PDF (capturar erros específicos para fornecer debug útil)
          try {
            const clientLogoUrl = (project.client as any)?.logoUrl || null;
            const clientName = (project.client as any)?.name || undefined;
            const ownerLogoUrl = (project.owner as any)?.logoUrl || null;
            const ownerName = (project.owner as any)?.name || (project.owner as any)?.email || undefined;
            
            const pdfBuffer = await this.pdfGenerator.generatePDF(
              html, 
              clientLogoUrl || undefined, 
              clientName,
              ownerLogoUrl || undefined,
              ownerName
            );

            // Salvar PDF
            const pdfUrl = await this.pdfGenerator.uploadPDF(pdfBuffer, versionId);

            // Atualizar versão com URL do PDF
            await this.versionsService.updatePdfUrl(versionId, pdfUrl);

            // Nome do arquivo para download
            const fileName = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${version.versionNumber}.pdf`;

            this.logger.log(`[GenerationController] Enviando PDF: ${fileName} (${pdfBuffer.length} bytes)`);

            // Configurar headers para download (compatível com navegadores)
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length.toString());
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
            
            this.logger.log(`[GenerationController] Headers configurados, enviando buffer...`);
            return res.end(pdfBuffer, 'binary');

          } catch (pdfErr: any) {
            this.logger.error('[GenerationController] erro ao gerar PDF: ' + (((pdfErr as any)?.message) ?? pdfErr));

            const pdfDebug = process.env.PDF_DEBUG === 'true';
            const details: any = { message: (pdfErr as any)?.message || 'Erro ao gerar PDF' };
            if (pdfDebug) {
              details.debugHtml = '/tmp/gerrot-debug.html';
              details.screenshot = '/tmp/gerrot-screenshot.png';
            }

            return res.status(500).json({
              status: 'failed',
              message: 'Erro ao gerar PDF',
              details,
            });
          }
        }

        // Se for outro erro, propagar
        throw error;
      }
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao gerar PDF',
      });
    }
  };
}
