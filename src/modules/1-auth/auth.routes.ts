import express from 'express';
import { AuthController } from './auth.controller';

export function registerAuthRoutes(app: any): void {
  const router = express.Router();
  const controller = new AuthController();

  // POST /auth/register - Registrar novo usuário
  router.post('/register', controller.register);

  // POST /auth/login - Fazer login e receber token JWT
  router.post('/login', controller.login);

  // Registrar rotas com prefixo /auth
  app.use('/auth', router);
}

