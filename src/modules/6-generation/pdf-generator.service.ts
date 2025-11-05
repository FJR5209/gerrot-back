const PDFDocument = require('pdfkit');
import autoTable from 'jspdf-autotable';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import { Project } from '../4-projects/entities/project.entity';
import { LocalStorageService } from '../../common/storage/local-storage.service';

interface VersionData {
  id: string;
  content: string;
  versionNumber: number;
}

interface GenerateHTMLParams {
  project: Project;
  version: VersionData;
  client: any; // Client entity
}

export class PdfGenerator {
  private readonly logger = new Logger(PdfGenerator.name);
  private storageService: LocalStorageService;

  constructor() {
    // Salvar PDFs numa pasta previsível no cwd do backend
    const uploadDir = path.join(process.cwd(), 'pdfs');
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    this.storageService = new LocalStorageService(uploadDir);
  }

  /**
   * Gera HTML a partir dos dados do projeto e versão
   */
  public async generateHTML(data: GenerateHTMLParams): Promise<string> {
    this.logger.log('[PdfGenerator] Gerando HTML...');
    this.logger.log(`[PdfGenerator] Projeto: ${data.project.title}`);
    this.logger.log(`[PdfGenerator] Cliente: ${data.client?.name || 'N/A'}`);
    this.logger.log(`[PdfGenerator] Versão: ${data.version.versionNumber}`);
    this.logger.log(`[PdfGenerator] Conteúdo (primeiros 300 chars): ${data.version.content.substring(0, 300)}`);
    
    // Ler templates
    const capaTemplate = await this.readTemplate('capa.html');
    const roteiroTemplate = await this.readTemplate('roteiro-profissional.html');

    // Preparar logo do usuário/owner (esquerda)
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const owner = data.project.owner;
    const ownerName = owner?.name || owner?.email || 'Usuário';
    
    let logoUsuarioHtml = `<div class="logo-placeholder">${ownerName}</div>`;
    
    // Se o owner tiver logo, usar a logo dele
    if (owner?.logoUrl) {
      const logoUrl = owner.logoUrl.startsWith('http') 
        ? owner.logoUrl 
        : `${baseUrl}${owner.logoUrl}`;
      logoUsuarioHtml = `<img src="${logoUrl}" class="logo" alt="${ownerName}" />`;
    } else {
      // Fallback: tentar logo padrão da Nuvem Branding
      const systemLogoPath = path.join(process.cwd(), 'uploads', 'nuvem-logo.png');
      if (fs.existsSync(systemLogoPath)) {
        logoUsuarioHtml = `<img src="${baseUrl}/uploads/nuvem-logo.png" class="logo" alt="Nuvem Branding" />`;
      }
    }

    // Preparar logo do cliente (direita)
    let logoClienteHtml = `<div class="logo-placeholder">${data.client.name}</div>`;
    if (data.client.logoUrl) {
      // Converter URL relativa para absoluta
      const logoUrl = data.client.logoUrl.startsWith('http') 
        ? data.client.logoUrl 
        : `${baseUrl}${data.client.logoUrl}`;
      logoClienteHtml = `<img src="${logoUrl}" class="logo" alt="${data.client.name}" />`;
    }

    // Validar dados
    if (!data.client || !data.client.name) {
      console.error('❌ Cliente não fornecido ou sem nome');
      throw new Error('Cliente não fornecido ou sem nome');
    }

    // Substituir variáveis nos templates
    const dataHoje = new Date();
    const dataFmt = dataHoje.toLocaleDateString('pt-BR');
    
    const capaHTML = this.replaceVariables(capaTemplate, {
      titulo: data.project.title || 'Roteiro',
      cliente: data.client.name || 'Cliente',
      tipo: data.project.scriptType || 'social_media',
      data: dataFmt,
      versao: String(data.version.versionNumber),
      logoCliente: logoClienteHtml,
      logoUsuario: logoUsuarioHtml,
    });

    const roteiroHTML = this.replaceVariables(roteiroTemplate, {
      titulo: data.project.title,
      conteudo: data.version.content,
      versao: data.version.versionNumber.toString(),
      logoCliente: logoClienteHtml,
      logoUsuario: logoUsuarioHtml,
    });

    // Combinar templates
    const finalHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="pdf-title" content="${(data.project.title || 'Roteiro').replace(/"/g, '&quot;')}">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          ${capaHTML}
          <div class="page-break"></div>
          ${roteiroHTML}
        </body>
      </html>
    `;
    
    this.logger.log(`[PdfGenerator] HTML gerado (${finalHTML.length} chars)`);
    return finalHTML;
  }

  /**
   * Gera PDF usando PDFKit
   */
  public async generatePDF(
    html: string, 
    clientLogoUrl?: string, 
    clientName?: string,
    ownerLogoUrl?: string,
    ownerName?: string
  ): Promise<Buffer> {
    // Validação rápida
    const minHtmlChars = Number(process.env.PDF_MIN_HTML_CHARS || 20);
    if (!html || html.replace(/\s/g, '').length < minHtmlChars) {
      const msg = `[PdfGenerator] HTML inválido/curto (len=${html ? html.length : 0}). Abortando geração.`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    // salva HTML para inspeção quando ativado
    const pdfDebug = process.env.PDF_DEBUG === 'true';
    if (pdfDebug) {
      try {
        const debugPath = '/tmp/gerrot-debug.html';
        fs.writeFileSync(debugPath, html, 'utf8');
        this.logger.log(`[PdfGenerator] HTML salvo para debug: ${debugPath} (len=${html.length})`);
      } catch (err: any) {
        this.logger.error('[PdfGenerator] falha ao salvar HTML de debug: ' + (err?.message ?? err));
      }
    }

    try {
      // === USANDO PDFKIT - MAIS CONFIÁVEL PARA NODE.JS ===
      this.logger.log('[PdfGenerator] Gerando PDF com PDFKit...');
      
      return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          this.logger.log(`[PdfGenerator] PDF gerado com PDFKit: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        // Extrair título e conteúdo do HTML
        const titleMatch = html.match(/<h2>(.*?)<\/h2>/);
        const title = titleMatch ? titleMatch[1] : 'Roteiro';
        
        // === CABEÇALHO COM DUAS LOGOS ===
        const pageWidth = doc.page.width;
        const marginLeft = 50;
        const marginRight = 50;
        const logoHeight = 40;
        const logoY = 30;
        
        // Logo do usuário/owner (esquerda)
        if (ownerLogoUrl) {
          try {
            let logoPath = ownerLogoUrl;
            if (ownerLogoUrl.startsWith('/uploads/')) {
              // Resolver para o diretório de uploads do projeto
              const fileRel = ownerLogoUrl.replace('/uploads/', '');
              logoPath = path.join(process.cwd(), 'gerrot-backend', 'uploads', fileRel);
            } else if (ownerLogoUrl.startsWith('http')) {
              this.logger.warn('[PdfGenerator] Logo remota do owner não suportada ainda:', ownerLogoUrl);
              logoPath = '';
            }
            
            if (logoPath && fs.existsSync(logoPath)) {
              doc.image(logoPath, marginLeft, logoY, { height: logoHeight });
            } else if (ownerName) {
              doc.fontSize(10).font('Helvetica-Bold').text(ownerName, marginLeft, logoY + 15);
            }
          } catch (err) {
            this.logger.warn('[PdfGenerator] Erro ao carregar logo do owner:', err);
            if (ownerName) {
              doc.fontSize(10).font('Helvetica-Bold').text(ownerName, marginLeft, logoY + 15);
            }
          }
        } else if (ownerName) {
          // Sem logo do owner: usar nome
          doc.fontSize(10).font('Helvetica-Bold').text(ownerName, marginLeft, logoY + 15);
        } else {
          // Fallback: tentar logo padrão da Nuvem Branding
          try {
            const systemLogoPath = path.join(process.cwd(), 'gerrot-backend', 'uploads', 'nuvem-logo.png');
            if (fs.existsSync(systemLogoPath)) {
              doc.image(systemLogoPath, marginLeft, logoY, { height: logoHeight });
            } else {
              doc.fontSize(10).font('Helvetica-Bold').text('@nuvembranding', marginLeft, logoY + 15);
            }
          } catch (err) {
            this.logger.warn('[PdfGenerator] Erro ao carregar logo do sistema');
            doc.fontSize(10).font('Helvetica-Bold').text('@nuvembranding', marginLeft, logoY + 15);
          }
        }
        
        // Logo do cliente (direita)
        if (clientLogoUrl) {
          try {
            // Se for URL local (uploads), converter para caminho do filesystem
            let logoPath = clientLogoUrl;
            if (clientLogoUrl.startsWith('/uploads/')) {
                // clientLogoUrl vem como "/uploads/arquivo.ext"
                const fileRel = clientLogoUrl.replace('/uploads/', '');
                logoPath = path.join(process.cwd(), 'gerrot-backend', 'uploads', fileRel);
            } else if (clientLogoUrl.startsWith('http')) {
              // TODO: Baixar logo remota (implementar depois se necessário)
              this.logger.warn('[PdfGenerator] Logo remota não suportada ainda:', clientLogoUrl);
              logoPath = '';
            }
            
            if (logoPath && fs.existsSync(logoPath)) {
              const logoWidth = 100; // Ajuste conforme necessário
              doc.image(logoPath, pageWidth - marginRight - logoWidth, logoY, { 
                height: logoHeight,
                align: 'right'
              });
            } else if (clientName) {
              // Placeholder com nome do cliente alinhado à direita
              doc.fontSize(10).font('Helvetica-Bold').text(clientName, pageWidth - marginRight - 200, logoY + 15, {
                width: 200,
                align: 'right'
              });
            }
          } catch (err) {
            this.logger.warn('[PdfGenerator] Erro ao carregar logo do cliente:', err);
            if (clientName) {
              doc.fontSize(10).font('Helvetica-Bold').text(clientName, pageWidth - marginRight - 200, logoY + 15, {
                width: 200,
                align: 'right'
              });
            }
          }
        } else if (clientName) {
          // Sem logo fornecida: usar nome do cliente como placeholder à direita
          doc.fontSize(10).font('Helvetica-Bold').text(clientName, pageWidth - marginRight - 200, logoY + 15, {
            width: 200,
            align: 'right'
          });
        }
        
        // Espaço abaixo das logos (sem linhas decorativas)
        doc.moveDown(3);
        
        // Determinar título: preferir meta pdf-title; fallback para título extraído ou padrão
        let extractedTitle = 'Roteiro';
        try {
          const metaMatch = html.match(/<meta\s+name=["']pdf-title["']\s+content=["']([^"']+)["']\s*\/>/i);
          if (metaMatch && metaMatch[1]) extractedTitle = metaMatch[1];
        } catch {}
        // Fallback: tentar extrair de <div class="title"> ...
        if (!extractedTitle || extractedTitle === 'Roteiro') {
          const titleDivMatch = html.match(/<div\s+class=["']title["'][^>]*>([\s\S]*?)<\/div>/i);
          if (titleDivMatch) {
            let raw = titleDivMatch[1];
            raw = raw.replace(/<span[\s\S]*?<\/span>/gi, '');
            raw = raw.replace(/<[^>]+>/g, '');
            extractedTitle = (raw || '').trim() || 'Roteiro';
          }
        }

  // Título centralizado (sem linhas decorativas) com largura controlada
  const contentWidth = pageWidth - marginLeft - marginRight - 40;
  const contentX = (pageWidth - contentWidth) / 2;
  doc.fontSize(24).font('Helvetica-Bold').text(extractedTitle, contentX, undefined, { width: contentWidth, align: 'center' });
  doc.moveDown(1.5);
        
        // Extrair conteúdo especificamente do bloco do roteiro
        let content = '';
        const contentBlockMatch = html.match(/<div\s+class=["']conteudo-roteiro["'][^>]*>([\s\S]*?)<\/div>/i);
        if (contentBlockMatch && contentBlockMatch[1]) {
          let inner = contentBlockMatch[1];
          inner = inner.replace(/<style[\s\S]*?<\/style>/gi, '');
          inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '');
          inner = inner.replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n');
          inner = inner.replace(/<br\s*\/>/gi, '\n');
          inner = inner.replace(/<[^>]+>/g, '');
          content = this.decodeHtmlEntities(inner)
            .replace(/\u00a0/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        } else {
          // Fallback: limpar todo o HTML
          let body = html;
          body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
          body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
          body = body.replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n');
          body = body.replace(/<br\s*\/>/gi, '\n');
          body = body.replace(/<[^>]+>/g, '');
          content = this.decodeHtmlEntities(body).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        }
        
        this.logger.log(`[PdfGenerator] Conteúdo extraído: ${content.length} caracteres`);
        this.logger.log(`[PdfGenerator] Primeiros 200 chars do conteúdo: ${content.substring(0, 200)}`);
        
        // Renderizar conteúdo
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const timeRe = /^\s*\[(\d+\s*s?)\s*-\s*(\d+\s*s?)\]\s*:?.*/i;
        
        this.logger.log(`[PdfGenerator] Total de parágrafos: ${paragraphs.length}`);
        
        for (const para of paragraphs) {
          const lines = para.split('\n');
          this.logger.log(`[PdfGenerator] Processando parágrafo com ${lines.length} linhas`);
          
          for (const line of lines) {
            if (!line || line.trim().length === 0) continue;
            
            this.logger.log(`[PdfGenerator] Adicionando linha ao PDF: "${line.substring(0, 50)}..."`);
            
            // Detectar subtítulo de tempo
            if (timeRe.test(line)) {
              doc.moveDown(0.5);
              doc.fontSize(14).font('Helvetica-Bold').text(line.trim(), contentX, undefined, { width: contentWidth, align: 'left' });
              doc.fontSize(11).font('Helvetica');
              doc.moveDown(0.3);
            } else {
              doc.fontSize(11).text(line.trim(), contentX, undefined, {
                width: contentWidth,
                align: 'justify',
                continued: false
              });
            }
          }
          
          doc.moveDown(0.5);
        }
        
        this.logger.log(`[PdfGenerator] Conteúdo adicionado ao PDF. Finalizando...`);
        
        // Rodapé em todas as páginas
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(9).font('Helvetica').text(
            `Página ${i + 1} de ${pages.count}`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          );
        }
        
        doc.end();
      });
    } catch (err: any) {
      this.logger.error('[PdfGenerator] erro ao gerar PDF: ' + (err?.message ?? err), err?.stack);
      throw err;
    }
  }

  /**
   * Parse tabela Markdown para formato de array
   */
  private parseMarkdownTable(markdown: string): { headers: string[], rows: string[][] } {
    if (!markdown || typeof markdown !== 'string') {
      this.logger.warn('[PdfGenerator] Markdown inválido ou vazio');
      return { headers: [], rows: [] };
    }

    // Decodificar entidades HTML se houver
    const decodedMarkdown = markdown
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const lines = decodedMarkdown
      .trim()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    this.logger.log(`[PdfGenerator] Linhas encontradas no markdown: ${lines.length}`);
    
    if (lines.length < 2) {
      this.logger.warn('[PdfGenerator] Markdown muito curto (menos de 2 linhas)');
      return { headers: [], rows: [] };
    }

    // Verificar estrutura básica de tabela Markdown
    const headerLine = lines[0];
    const separatorIndex = lines.findIndex(l => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l));
    const headers = headerLine
      .split('|')
      .map(h => h.trim())
      .filter(h => h.length > 0);

    // Se não há separador de header ou menos de 2 colunas, não é tabela válida
    if (separatorIndex === -1 || headers.length < 2) {
      this.logger.warn('[PdfGenerator] Conteúdo não corresponde a uma tabela Markdown válida');
      return { headers: [], rows: [] };
    }

    this.logger.log(`[PdfGenerator] Headers encontrados: ${JSON.stringify(headers)}`);

    // Início dos dados após o separador
    const dataStartIndex = separatorIndex + 1;

    const dataLines = lines.slice(dataStartIndex);
    
    this.logger.log(`[PdfGenerator] Linhas de dados: ${dataLines.length}`);
    
    const rows = dataLines.map((line, idx) => {
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
      this.logger.log(`[PdfGenerator] Linha ${idx}: ${cells.length} células`);
      return cells;
    }).filter(row => row.length > 0);

    this.logger.log(`[PdfGenerator] Total de linhas válidas: ${rows.length}`);

    return { headers, rows };
  }

  /**
   * Decodifica entidades HTML comuns para texto puro
   */
  private decodeHtmlEntities(input: string): string {
    if (!input) return '';
    return input
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Faz upload do PDF para storage e retorna a URL pública
   */
  public async uploadPDF(pdfBuffer: Buffer, versionId: string): Promise<string> {
    const filename = `roteiro-${versionId}-${Date.now()}.pdf`;
    const filePath = this.storageService.getUploadPath(filename);

    // Salvar arquivo localmente (em produção, fazer upload para S3)
    fs.writeFileSync(filePath, pdfBuffer);

    // Retornar URL pública
    const publicUrl = this.storageService.getPublicUrl(filename);
    return publicUrl.replace('/uploads', '/pdfs');
  }

  /**
   * Lê um template HTML do diretório templates
   */
  private async readTemplate(filename: string): Promise<string> {
    const candidates = [
      path.join(__dirname, 'templates', filename), // dist
      path.join(process.cwd(), 'dist', 'src', 'modules', '6-generation', 'templates', filename), // fallback dist variante
      path.join(process.cwd(), 'src', 'modules', '6-generation', 'templates', filename), // dev src
      path.join(process.cwd(), 'gerrot-backend', 'src', 'modules', '6-generation', 'templates', filename), // caso cwd esteja na raiz monorepo
    ];

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8');
        }
      } catch {}
    }

    console.warn(`Template ${filename} não encontrado em ${candidates.join(', ')}. Usando padrão`);
    return this.getDefaultTemplate(filename);
  }

  /**
   * Template padrão caso o arquivo não exista
   */
  private getDefaultTemplate(filename: string): string {
    if (filename === 'capa.html') {
      return `
        <div style="height:100vh; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:24px 40px; border-bottom:1px solid #e5e7eb;">
            <div style="font-size:14px; color:#6b7280;">{{tipo}}</div>
            <div>{{logo}}</div>
          </div>
          <div style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center; padding:0 40px;">
            <div>
              <h1 style="margin:0; font-size:34px; color:#111827;">{{titulo}}</h1>
              <p style="margin:12px 0 0; font-size:16px; color:#374151;">Cliente: <strong>{{cliente}}</strong></p>
              <p style="margin:4px 0 0; font-size:14px; color:#6b7280;">Versão {{versao}} • {{data}}</p>
            </div>
          </div>
          <div style="height:6px; background:linear-gradient(90deg,#2563eb,#10b981);"></div>
        </div>
      `;
    }
    return `
      <div style="margin: 40px;">
        <h2>{{titulo}}</h2>
        <p>{{conteudo}}</p>
      </div>
    `;
  }

  /**
   * Substitui variáveis {{variavel}} no template
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Lê um asset (como logo.png) dos diretórios de templates conhecidos e retorna como Data URI
   */
  private async readAssetAsDataUri(file: string): Promise<string> {
    try {
      const isAbsolute = path.isAbsolute(file);
      const candidates = isAbsolute
        ? [file]
        : [
            path.join(__dirname, 'templates', file),
            path.join(process.cwd(), 'dist', 'src', 'modules', '6-generation', 'templates', file),
            path.join(process.cwd(), 'src', 'modules', '6-generation', 'templates', file),
            path.join(process.cwd(), 'gerrot-backend', 'src', 'modules', '6-generation', 'templates', file),
          ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase();
          const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
    } catch {}
    return '';
  }
}

