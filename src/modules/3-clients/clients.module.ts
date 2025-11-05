import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

export class ClientsModule {
  public controller = new ClientsController();
  public service = new ClientsService();
}
