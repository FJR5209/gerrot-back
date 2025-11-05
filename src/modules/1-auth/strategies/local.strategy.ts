import { AuthService } from '../auth.service';
import { User } from '../../2-users/entities/user.entity';

export interface LocalValidationResult {
  userId: string;
  email: string;
  name?: string; // Adicionar nome para incluir no JWT
}

export class LocalStrategy {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Valida credenciais email/senha
   */
  public async validate(email: string, password: string): Promise<LocalValidationResult | null> {
    const user = await this.authService.validateUser(email, password);
    
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name, // Incluir nome para JWT e auditoria
    };
  }
}
