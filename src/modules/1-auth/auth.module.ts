import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export class AuthModule {
  public controller = new AuthController();
  public service = new AuthService();
}
