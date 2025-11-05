import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/1-auth/auth.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name?: string;
  };
}

export class JwtAuthGuard {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware para proteger rotas com JWT
   */
  public canActivate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ message: 'Token de autenticação não fornecido' });
          return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer '
        const payload = this.authService.verifyToken(token);

        if (!payload) {
          res.status(401).json({ message: 'Token inválido ou expirado' });
          return;
        }

        // Adicionar informações do usuário ao request
        req.user = {
          userId: payload.userId,
          email: payload.email,
          name: (payload as any).name,
        };

        next();
      } catch (error) {
        res.status(401).json({ message: 'Erro ao validar token' });
      }
    };
  }
}
