import express from 'express';
import multer from 'multer';
import * as path from 'path';
import { LocalStorageService } from '../../common/storage/local-storage.service';
import { UsersController } from './users.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Aceitar apenas imagens
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos (JPEG, PNG, GIF, WebP)'));
    }
  },
});

export function registerUsersRoutes(app: any): void {
  const router = express.Router();
  const controller = new UsersController();
  const jwtGuard = new JwtAuthGuard();

  // Storage local para salvar logos de usuários como URL pública
  const uploadDir = path.join(process.cwd(), 'gerrot-backend', 'uploads');
  const storageService = new LocalStorageService(uploadDir);

  // Middleware para injetar storage no request
  router.use((req: any, _res: any, next: any) => {
    req.storage = storageService;
    next();
  });

  // Todas as rotas de usuários requerem autenticação
  router.use(jwtGuard.canActivate());

  // 1) Listar todos os usuários
  router.get('/users', controller.list);

  // 2) Obter detalhes de um usuário específico
  router.get('/users/:id', controller.getById);

  // 3) Atualizar o nome de um usuário
  router.patch('/users/:id', controller.update);

  // 4) Deletar um usuário
  router.delete('/users/:id', controller.remove);
  // 4.1) Alias compatível: DELETE /users?id=...
  router.delete('/users', controller.removeByQuery);

  // 5) Upload/alterar logo do usuário (multipart/form-data)
  router.patch(
    '/users/:id/logo',
    (req: any, res: any, next: any) => {
      upload.single('file')(req, res, (err: any) => {
        // Tratamento de erros do multer (tamanho, tipo de arquivo)
        if (err) {
          return res.status(400).json({ message: err.message || 'Erro ao fazer upload do arquivo' });
        }
        next();
      });
    },
    controller.updateLogo
  );

  // 5.1) Alias compat: PUT também aceita upload de logo
  (router as any).put(
    '/users/:id/logo',
    (req: any, res: any, next: any) => {
      upload.single('file')(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ message: err.message || 'Erro ao fazer upload do arquivo' });
        }
        next();
      });
    },
    controller.updateLogo
  );

  // 6) Obter a logo do usuário (binário)
  router.get('/users/:id/logo', controller.getLogo);

  // 7) Remover a logo do usuário
  router.delete('/users/:id/logo', controller.deleteLogo);

  // 7.1) Alias temporário: /users/logo/:id
  router.delete('/users/logo/:id', controller.deleteLogo);

  app.use(router);
}
