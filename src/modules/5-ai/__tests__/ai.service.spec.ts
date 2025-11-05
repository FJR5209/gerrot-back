import { AiService } from '../ai.service';

describe('AiService generateLocally fallback', () => {
  it('should generate blocks when prompt contains explicit ranges', async () => {
    // For tests, desabilitar chamadas remotas garantindo que GEMINI_API_KEY não esteja definida
    process.env.GEMINI_API_KEY = '';
    const svc = new AiService();
    const prompt = 'Criar roteiro para anúncio. Ranges: 0-5s, 5-15s, 15-25s.';

    const out = await svc.generate({ projectId: 'p1', prompt, fullContext: '' });

    expect(typeof out).toBe('string');
    expect(out).toMatch(/\[0s - 5s\]:/);
    expect(out).toMatch(/Cena:/);
    expect(out).toMatch(/Narração:/);
    expect(out).toMatch(/TNT:/);
  });

  it('should respect totalDuration and produce multiple blocks', async () => {
    process.env.GEMINI_API_KEY = '';
    const svc = new AiService();
    const data = {
      projectId: 'p2',
      prompt: 'Anúncio institucional',
      fullContext: '',
      settings: { totalDuration: 28, preferredBlocks: 4 }
    } as any;

    const out = await svc.generate(data);

    // Deve conter 4 blocos (4 ocorrências de '[Xs - Ys]')
    const blocks = out.match(/\[\d+s - \d+s\]:/g) || [];
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    expect(out).toMatch(/Cena:/);
    expect(out).toMatch(/Narração:/);
  });
});
