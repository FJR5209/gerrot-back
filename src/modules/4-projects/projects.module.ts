import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

export class ProjectsModule {
  public controller = new ProjectsController();
  public service = new ProjectsService();
}
