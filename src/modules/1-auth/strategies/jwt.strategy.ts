import { AuthService } from '../auth.service';

export interface JwtPayload {
  userId: string;
  email: string;
}

export class JwtStrategy {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Valida token JWT extraído do header Authorization
   */
  public validate(token: string): JwtPayload | null {
    return this.authService.verifyToken(token);
  }
}
