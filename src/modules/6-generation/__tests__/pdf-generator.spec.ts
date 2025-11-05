import { PdfGenerator } from '../pdf-generator.service';
import { Project } from '../../4-projects/entities/project.entity';

describe('PdfGenerator', () => {
  const pdfGen = new PdfGenerator();

  test('generateHTML should produce HTML containing title and content', async () => {
    const project = ({ title: 'Teste Título', scriptType: 'social_media' } as unknown) as Project;
    const version = { id: 'v1', content: 'Conteúdo do roteiro de teste', versionNumber: 1 };
    const client = { id: 'c1', name: 'Cliente Teste' };

    const html = await pdfGen.generateHTML({ project, version: version as any, client: client as any });

    expect(typeof html).toBe('string');
    expect(html).toContain('Teste Título');
    expect(html).toContain('Conteúdo do roteiro de teste');
  }, 10000);

  test('generatePDF should throw when HTML is too short', async () => {
    // For safety, ensure PDF_DEBUG is false so generatePDF doesn't try to write debug files
    process.env.PDF_DEBUG = 'false';
    process.env.PDF_MIN_HTML_CHARS = '20';

    await expect(pdfGen.generatePDF('')).rejects.toThrow(/HTML inválido/);
  });
});
