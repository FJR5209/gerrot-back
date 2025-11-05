import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';

// Garantir que variáveis do .env sejam carregadas quando este módulo for importado
dotenv.config();

export interface PromptData {
  projectId: string;
  prompt: string;
  fullContext: string;
  // settings pode conter campos livres como audience, tone, objective, themes, times, etc.
  settings?: Record<string, any>;
}

export interface StreamingCallback {
  onChunk: (chunk: string) => void;
  onFinished: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  // Few-shot examples para injetar quando chamando a API remota
  private fewShotExamples: Array<{ in: string; out: string }> = [
    {
      in: 'Produto: smartphone; tom: informativo; tempos: 0-5s, 5-20s, 20-30s',
      out:
        `[0s - 5s]:\nCena: Close do produto girando em pedestal.\nNarração: Apresentamos o novo produto.\nTNT: Chegou o futuro\n\n` +
        `[5s - 20s]:\nCena: Uso em contexto real destacando recursos.\nNarração: Experiência e benefícios.\nTNT: Tecnologia de Ponta\n\n` +
        `[20s - 30s]:\nCena: Encerramento com logo e CTA.\nNarração: Saiba mais hoje.\nTNT: Disponível Agora\n\n`,
    },
    {
      in: 'Serviço: app financeiro; tom: sério; tempos: 0-7s,7-25s,25-30s',
      out:
        `[0s - 7s]:\nCena: Interface do app sendo usada.\nNarração: Controle financeiro ao seu alcance.\nTNT: Segurança & Simplicidade\n\n` +
        `[7s - 25s]:\nCena: Benefícios e casos de uso.\nNarração: Organize suas finanças facilmente.\nTNT: Gerencie agora\n\n` +
        `[25s - 30s]:\nCena: Logo e CTA.\nNarração: Baixe o app hoje.\nTNT: Disponível já\n\n`,
    },
  ];

  // Examples por template/scriptType (exemplos curtos específicos para cada formato)
  private fewShotByTemplate: Record<string, Array<{ in: string; out: string }>> = {
    vt: [
      {
        in: 'VT promocional, tom: enérgico, tempos: 0-5s,5-20s,20-30s',
        out:
          `[0s - 5s]:\nCena: Close no produto com iluminação dramática.\nNarração: Apresentamos o lançamento.\nTNT: Novo Chegou\n\n` +
          `[5s - 20s]:\nCena: Demonstração rápida dos recursos.\nNarração: Experimente desempenho e design.\nTNT: Veja agora\n\n` +
          `[20s - 30s]:\nCena: Logo + CTA.\nNarração: Saiba mais no site.\nTNT: Disponível já\n\n`,
      },
    ],
    social_media: [
      {
        in: 'Post social, tom: direto, tempos: 0-3s,3-12s,12-30s',
        out:
          `[0s - 3s]:\nCena: Abertura impactante com produto.\nNarração: Chamada curta.\nTNT: Imperdível\n\n` +
          `[3s - 12s]:\nCena: Demonstração rápida.\nNarração: Benefício principal.\nTNT: Teste grátis\n\n` +
          `[12s - 30s]:\nCena: Prova social e CTA.\nNarração: Veja depoimentos.\nTNT: Saiba mais\n\n`,
      },
    ],
    internal: [
      {
        in: 'Uso interno, tom: informativo, tempos: 0-10s,10-25s,25-30s',
        out:
          `[0s - 10s]:\nCena: Contexto e objetivo do produto.\nNarração: Explicação técnica.\nTNT: Informe-se\n\n` +
          `[10s - 25s]:\nCena: Demonstração detalhada.\nNarração: Pontos de atenção e métricas.\nTNT: Dados chave\n\n` +
          `[25s - 30s]:\nCena: Encerramento com próximos passos.\nNarração: Call to action interno.\nTNT: Proceda\n\n`,
      },
    ],
  };

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('⚠️  GEMINI_API_KEY não configurada. Funcionalidade de IA desabilitada.');
    }
  }

  /**
   * Constrói o prompt final combinando o prompt do usuário, contexto e settings
   */
  private buildPrompt(data: PromptData): string {
    let fullPrompt = '';
    // Incluir few-shot examples no início para orientar modelos remotos
    try {
      if (this.genAI) {
        // Se o usuário informou um scriptType/template, preferir exemplos específicos
        const templateKey = (data.settings && (data.settings.scriptType || data.settings.templateName)) as string | undefined;
        if (templateKey && this.fewShotByTemplate[templateKey]) {
          fullPrompt += 'Exemplos de formato (few-shot) para template: ' + templateKey + '\n';
          for (const ex of this.fewShotByTemplate[templateKey]) {
            fullPrompt += `INPUT: ${ex.in}\nOUTPUT:\n${ex.out}\n`;
          }
          fullPrompt += '\n';
        }

        // Em seguida, adicionar exemplos genéricos
        fullPrompt += 'Exemplos de formato (few-shot):\n';
        for (const ex of this.fewShotExamples) {
          fullPrompt += `INPUT: ${ex.in}\nOUTPUT:\n${ex.out}\n`;
        }
        fullPrompt += '\n';
      }
    } catch (e) {
      // não falhar por causa de exemplos
    }

    // Adicionar contexto do roteiro existente
    if (data.fullContext) {
      fullPrompt += `Contexto do roteiro atual:\n${data.fullContext}\n\n`;
    }

    // Adicionar configurações (audiência, tom, objetivo)
    if (data.settings) {
      const settingsText: string[] = [];
      if (data.settings.audience) {
        settingsText.push(`Público-alvo: ${data.settings.audience}`);
      }
      if (data.settings.tone) {
        settingsText.push(`Tom: ${data.settings.tone}`);
      }
      if (data.settings.objective) {
        settingsText.push(`Objetivo: ${data.settings.objective}`);
      }
      if (settingsText.length > 0) {
        fullPrompt += `Configurações:\n${settingsText.join('\n')}\n\n`;
      }
    }

    // Adicionar o prompt do usuário
    fullPrompt += `Instrução: ${data.prompt}\n\n`;

    // Regras de saída (formatos exigidos)
    fullPrompt += `Por favor, gere o roteiro seguindo estritamente o formato abaixo. Respeite os tempos, temas e instruções fornecidas. ` +
      `Saída esperada (exemplo):\n` +
      `[0s - 3s]:\n` +
      `Cena: Descrição da cena\n` +
      `Narração: Texto da narração (se houver)\n` +
      `TNT: Texto curto para sobreposição (TNT)\n\n` +
      `Repita para todos os blocos de tempo necessários. Se o usuário forneceu temas ou tempos específicos em settings, incorpore-os e garanta que os blocos de tempo cubram a duração total indicada. Não inclua explicações adicionais fora do roteiro; retorne apenas o roteiro formatado.`;

    return fullPrompt;
  }

  /**
   * Gera resposta da IA com streaming
   */
  public async generateStreaming(
    data: PromptData,
    callback: StreamingCallback
  ): Promise<void> {
    if (!this.genAI) {
      callback.onError(new Error('API do Gemini não configurada. Defina GEMINI_API_KEY no .env'));
      return;
    }

    try {
      let modelName = process.env.GEMINI_MODEL || 'models/text-bison-001';
      let model = this.genAI.getGenerativeModel({ model: modelName });
      const prompt = this.buildPrompt(data);

      // Fazer a requisição com streaming
      let result;
      try {
        result = await model.generateContentStream(prompt);
      } catch (innerErr: any) {
        // Se o modelo padrão não existir para a versão da API, tentar descobrir modelos disponíveis
        const msg = String(innerErr?.message || innerErr || '');
        this.logger.warn('[AiService] erro no model.generateContentStream, message=' + msg);
        if (msg.includes('is not found') || msg.includes('not found') || msg.includes('404')) {
          try {
            // Tentar consultar listagem de modelos diretamente via HTTP (usa API key do .env)
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey) {
              const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
              const res = await fetch(url);
              if (res.ok) {
                const j = await res.json();
                const models: any[] = j.models || [];
                // Heurística: priorizar modelos com prefixo 'models/gemini-' ou que contenham 'gemini' e
                // preferir modelos que indiquem capacidades de geração/streaming quando disponível
                let candidate = models.find((m) => /^models\/gemini[-_]/i.test(m.name));
                if (!candidate) {
                  candidate = models.find((m) => /gemini/i.test(m.name) && /generate|stream/i.test(JSON.stringify(m)));
                }
                if (!candidate) {
                  // fallback mais amplo
                  candidate = models.find((m) => /gemini|chat|text|bison/i.test(m.name));
                }
                if (candidate && candidate.name) {
                  modelName = candidate.name;
                  this.logger.log(`[AiService] usando modelo alternativo detectado: ${modelName}`);
                  model = this.genAI.getGenerativeModel({ model: modelName });
                  result = await model.generateContentStream(prompt);
                }
              }
            }
          } catch (listErr) {
            this.logger.warn('[AiService] falha ao listar modelos: ' + ((listErr as any)?.message || listErr));
          }
        }

        if (!result) throw innerErr;
      }
      let fullResponse = '';

      // Ler o stream chunk por chunk
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          // Enviar cada chunk imediatamente para o frontend
          callback.onChunk(chunkText);
          // Log de debug do chunk (curto)
          this.logger.debug(`[AiService] chunk received len=${chunkText.length} preview=${chunkText.slice(0,80)}`);
        }
      }

      // Quando terminar, enviar a resposta completa
      this.logger.log(`[AiService] full response generated, length=${fullResponse.length}`);
      this.logger.debug(`[AiService] full response preview:\n${fullResponse.slice(0,1000)}`);
      callback.onFinished(fullResponse);
    } catch (error: any) {
      this.logger.error('Erro ao gerar conteúdo com Gemini: ' + (error?.message ?? error), error?.stack);
      callback.onError(
        new Error(error.message || 'Erro ao processar solicitação da IA')
      );
    }
  }

  /**
   * Método síncrono (sem streaming) - para casos especiais
   */
  public async generate(data: PromptData): Promise<string> {
    // Implementa retries simples com backoff para casos transitórios na API Gemini
    const maxRetries = Number(process.env.GEN_AI_MAX_RETRIES || 2);
    const baseDelayMs = Number(process.env.GEN_AI_RETRY_DELAY_MS || 500);

    const attempt = async (tryCount: number): Promise<string> => {
      let fullResponse = '';

      try {
        await new Promise<void>((resolve, reject) => {
          this.generateStreaming(
            data,
            {
              onChunk: (chunk) => {
                fullResponse += chunk;
              },
              onFinished: () => {
                resolve();
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        });

        return fullResponse;
      } catch (err) {
        if (tryCount < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, tryCount);
          this.logger.warn(`[AiService] tentativa ${tryCount + 1} falhou, retry em ${delay}ms: ${(((err as any)?.message) ?? err)}`);
          await new Promise((r) => setTimeout(r, delay));
          return attempt(tryCount + 1);
        }
        this.logger.error('[AiService] falha após retries: ' + (((err as any)?.message) ?? err));
        throw err;
      }
    };

    try {
      return await attempt(0);
    } catch (err) {
      // Se houve erro com a API externa, tentar geração local como fallback
      this.logger.warn('[AiService] falha na geração remota, usando gerador local de fallback: ' + (((err as any)?.message) ?? err));
      try {
        const local = this.generateLocally(data);
        this.logger.log('[AiService] geração local concluída, length=' + local.length);
        return local;
      } catch (localErr) {
        this.logger.error('[AiService] falha na geração local: ' + (((localErr as any)?.message) ?? localErr));
        throw err; // rethrow original
      }
    }
  }

  /**
   * Gera um roteiro simples localmente quando a API externa não está disponível.
   * Tenta respeitar blocos de tempo fornecidos na descrição (ex: "0-5s, 5-15s, 15-25s, 25-30s")
   * ou divide a duração total em blocos padrão.
   */
  private generateLocally(data: PromptData): string {
    const prompt = (data.prompt || '').trim();
    const settings = data.settings || {};

    // Few-shot examples (simples) - usados como estilo de referência
    const examples = [
      {
        hint: 'produto de limpeza, tom amigável',
        out: `[0s - 5s]:\nCena: Uma pessoa limpa rapidamente uma superfície, close no produto.\nNarração: "Limpeza eficiente em segundos."\nTNT: "Ação Rápida"\n\n`
      },
      {
        hint: 'app financeiro, tom sério',
        out: `[0s - 7s]:\nCena: Tela do app mostrando transações, pessoa satisfeita.\nNarração: "Controle financeiro ao seu alcance."\nTNT: "Seguro • Simples"\n\n`
      }
    ];

    // Extrair ranges explícitos do prompt (ex: 0-5s, 5-15s)
    const ranges: Array<{ start: number; end: number }> = [];
    const rangeRegex = /(?:(\d{1,3})\s*-\s*(\d{1,3})\s*s)/g;
    let m: RegExpExecArray | null;
    while ((m = rangeRegex.exec(prompt))) {
      ranges.push({ start: Number(m[1]), end: Number(m[2]) });
    }

    // Se não houver ranges explícitos, usar settings.totalDuration para dividir em blocos
    if (ranges.length === 0 && settings && settings.totalDuration) {
      const total = Math.max(5, Number(settings.totalDuration) || 30);
      // Tentar criar 3-4 blocos equilibrados
      const parts = settings.preferredBlocks && Number(settings.preferredBlocks) > 1 ? Number(settings.preferredBlocks) : 4;
      const base = Math.floor(total / parts);
      let cursor = 0;
      for (let i = 0; i < parts; i++) {
        const end = i === parts - 1 ? total : cursor + base;
        ranges.push({ start: cursor, end });
        cursor = end;
      }
    }

    // Fallback padrão (3 blocos) se ainda não houver ranges
    if (ranges.length === 0) {
      ranges.push({ start: 0, end: 5 }, { start: 5, end: 20 }, { start: 20, end: 30 });
    }

    // Detectar temas e público
    const themes: string[] = [];
    if (settings.themes && Array.isArray(settings.themes)) {
      settings.themes.forEach((t: any) => themes.push(String(t)));
    } else {
      const temaMatch = /Temas?:\s*([^\.\n]+)/i.exec(prompt);
      if (temaMatch) {
        temaMatch[1].split(/,|and|e/).forEach((s) => {
          const t = s.trim();
          if (t) themes.push(t);
        });
      }
    }

    const audience = settings.audience || /Público|Público-alvo/i.test(prompt) ? settings.audience : undefined;
    const tone = settings.tone || ( /tom:?\s*(amigável|sério|divertido)/i.exec(prompt)?.[1] );

    // Montar saída com linguagem um pouco mais natural, inspirada pelos exemplos
    let out = '';
    for (const r of ranges) {
      // Escolher um exemplo para estilo (rotativo)
      const ex = examples[(r.start + r.end) % examples.length];
      const themeText = themes.length ? themes.join(', ') : 'produto/serviço';
      const narrationAnchor = themes.length ? themes[0] : 'benefício principal';

      out += `[${r.start}s - ${r.end}s]:\n`;
      out += `Cena: ${this._buildSceneDescription(r, themeText, audience)}\n`;
      out += `Narração: ${this._buildNarration(r, narrationAnchor, tone)}\n`;
      out += `TNT: ${this._buildTNT(r, themeText)}\n\n`;
    }

    return out.trim();
  }

  // Pequeñas helpers para construir frases mais naturais no gerador local
  private _buildSceneDescription(range: { start: number; end: number }, themeText: string, audience?: string) {
    const len = range.end - range.start;
    if (len <= 5) return `Close rápido mostrando ${themeText} em ação.`;
    if (len <= 12) return `Sequência mostrando uso e resultado do ${themeText}.`;
    return `Cenário mais amplo mostrando usuário interagindo com o ${themeText} em contexto real.`;
  }

  private _buildNarration(range: { start: number; end: number }, anchor: string, tone?: string) {
    const len = range.end - range.start;
    const base = tone && /amigável/i.test(String(tone)) ? 'Experimente agora' : 'Conheça';
    if (len <= 5) return `${base} o ${anchor} em poucos segundos.`;
    if (len <= 12) return `${base} como o ${anchor} facilita sua rotina.`;
    return `${base} porque o ${anchor} entrega resultado consistente para você.`;
  }

  private _buildTNT(range: { start: number; end: number }, themeText: string) {
    if (themeText.length > 20) return themeText.split(',')[0];
    const len = range.end - range.start;
    if (len <= 5) return 'Rápido • Impacto';
    if (len <= 12) return 'Clareza • Benefício';
    return 'Confiança • Resultado';
  }

  // exemplo onde processa a resposta da Gemini (ajuste nome do método conforme o arquivo real)
  async getCompletion(prompt: string): Promise<string> {
    try {
      this.logger.log('[AiService] getCompletion called, prompt length=' + (prompt?.length ?? 0));

      // Reutiliza o método de geração já implementado (streaming -> collect)
      const text = await this.generate({ projectId: 'debug', prompt, fullContext: '' });

      this.logger.log(`[AiService] completion length=${text.length}`);
      this.logger.debug('[AiService] completion preview:\n' + String(text).slice(0, 1000));
      return text;
    } catch (err: any) {
      this.logger.error('[AiService] erro em getCompletion: ' + (err?.message ?? err), err?.stack);
      throw err;
    }
  }
}
