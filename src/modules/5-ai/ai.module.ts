import { AiService } from './ai.service';

export class AiModule {
  public service = new AiService();
  // Gateway é inicializado no main.ts porque precisa do servidor Socket.IO
}
