import express from 'express';
import multer from 'multer';
import * as path from 'path';
import { ClientsController } from './clients.controller';
import { LocalStorageService } from '../../common/storage/local-storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const uploadDir = path.join(process.cwd(), 'gerrot-backend', 'uploads');
const storageService = new LocalStorageService(uploadDir);

const disk = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage: disk,
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

export function registerClientsRoutes(app: any): void {
  const router = express.Router();
  const controller = new ClientsController();
  const jwtGuard = new JwtAuthGuard();

  // Middleware para injetar storage no request
  router.use((req: any, _res: any, next: any) => {
    req.storage = storageService;
    next();
  });

  // Todas as rotas de clientes requerem autenticação
  router.use(jwtGuard.canActivate());

  // 1) Criar um novo cliente
  router.post('/clients', controller.create);

  // 2) Listar todos os clientes
  router.get('/clients', controller.list);

  // 3) Obter detalhes de um cliente específico
  router.get('/clients/:id', controller.getById);

  // 4) Atualizar o nome de um cliente
  router.patch('/clients/:id', controller.update);

  // 5) Deletar um cliente
  router.delete('/clients/:id', controller.remove);

  // 6) Upload/alterar logo do cliente (multipart/form-data)
  router.patch(
    '/clients/:id/logo',
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

  app.use(router);

  // Servir uploads publicamente
  app.use('/uploads', express.static(uploadDir));
}
