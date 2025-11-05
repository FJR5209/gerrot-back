import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

export class GenerationModule {
  public controller = new GenerationController();
  public service = new GenerationService();
}
