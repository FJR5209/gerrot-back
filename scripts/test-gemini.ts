import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AiService } from '../src/modules/5-ai/ai.service';

async function run() {
  const svc = new AiService();

  const data = {
    projectId: 'test-run',
    prompt: 'Gere 3 blocos de roteiro para vídeo de 30s com tempos: 0-5s, 5-20s, 20-30s. Tema: lançamento de produto, tom informativo.',
    fullContext: '',
    settings: { totalDuration: 30 }
  } as any;

  try {
    console.log('-> Executando geração de teste com Gemini (se configurado)...');
    const out = await svc.generate(data);
    console.log('=== Resultado (primeiros 1000 chars) ===');
    console.log(String(out).slice(0, 1000));
    console.log('=== FIM ===');
    process.exit(0);
  } catch (err: any) {
    console.error('Erro durante geração:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(2);
  }
}

run();
