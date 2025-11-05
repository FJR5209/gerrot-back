import { UsersController } from './users.controller';
import { UsersService } from './users.service';

export class UsersModule {
  public controller = new UsersController();
  public service = new UsersService();
}
