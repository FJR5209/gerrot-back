import { UsersService } from './users.service';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  file?: Express.Multer.File;
  storage?: any;
}

export class UsersController {
  private readonly service = new UsersService();

  /**
   * GET /users - Listar todos os usuários
   */
  public list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.service.findAll();
      // Não retornar passwordHash
      const sanitized = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        // Adiciona cache-busting baseado no logoUpdatedAt quando servindo via endpoint binário
        logoUrl: u.logo
          ? `/users/${u.id}/logo${u.logoUpdatedAt ? `?v=${new Date(u.logoUpdatedAt).getTime()}` : ''}`
          : (u.logoUrl || null),
        createdAt: u.createdAt,
      }));
      res.json(sanitized);
    } catch (error: unknown) {
      console.error('Erro ao listar usuários:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao listar usuários' });
    }
  };

  /**
   * GET /users/:id - Buscar usuário por ID
   */
  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.service.findOne(id);
      
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      // Não retornar passwordHash
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        logoUrl: user.logo
          ? `/users/${user.id}/logo${user.logoUpdatedAt ? `?v=${new Date(user.logoUpdatedAt).getTime()}` : ''}`
          : (user.logoUrl || null),
        createdAt: user.createdAt,
      });
    } catch (error: unknown) {
      console.error('Erro ao buscar usuário:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao buscar usuário' });
    }
  };

  /**
   * PATCH /users/:id - Atualizar campos permitidos do usuário
   */
  public update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'invalid id' });
        return;
      }

      // Permitir apenas alguns campos
      const allowed = ['name', 'email', 'role', 'active', 'avatarUrl'];
      const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
      const payload: any = {};
      for (const [k, v] of entries) {
        if (k === 'name' || k === 'email' || k === 'role') {
          if (typeof v === 'string') payload[k] = v.trim();
        } else if (k === 'active') {
          payload[k] = Boolean(v);
        } else if (k === 'avatarUrl') {
          payload[k] = v ?? null;
        }
      }

      let updated: any = null;

      // avatarUrl mapeado para logoUrl/clear
      if ('avatarUrl' in payload) {
        if (payload.avatarUrl && typeof payload.avatarUrl === 'string') {
          updated = await this.service.updateLogoUrl(id, payload.avatarUrl);
        } else {
          updated = await this.service.clearLogo(id);
        }
        delete payload.avatarUrl;
      }

      const restKeys = Object.keys(payload);
      if (restKeys.length > 0) {
        const partial: any = {};
        if (payload.name) partial.name = payload.name;
        if (payload.email) partial.email = payload.email;
        if (typeof payload.role !== 'undefined') partial.role = payload.role;
        if (typeof payload.active !== 'undefined') partial.active = payload.active;

        const after = await this.service.update(id, partial);
        updated = after || updated;
      }

      if (!updated) {
        updated = await this.service.findOne(id);
      }

      if (!updated) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        logoUrl: updated.logo
          ? `/users/${updated.id}/logo${updated.logoUpdatedAt ? `?v=${new Date(updated.logoUpdatedAt).getTime()}` : ''}`
          : (updated.logoUrl || null),
        createdAt: updated.createdAt,
      });
    } catch (error: unknown) {
      console.error('Erro ao atualizar usuário:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao atualizar usuário' });
    }
  };

  /**
   * PATCH /users/:id/logo - Upload de logo/avatar do usuário
   */
  public updateLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        res.status(400).json({ message: 'Nenhum arquivo enviado' });
        return;
      }
      if (!req.file.mimetype || !req.file.buffer) {
        res.status(400).json({ message: 'Arquivo inválido' });
        return;
      }
      let updated;
      // Preferir salvar como arquivo público em /uploads para ser facilmente referenciado no front e no PDF
      if ((req as any).storage) {
        try {
          const storage = (req as any).storage;
          const ts = Date.now();
          const safe = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${ts}-${safe}`;
          const filePath = storage.getUploadPath(filename);
          const fs = await import('fs');
          // Gravar arquivo em disco
          fs.writeFileSync(filePath, req.file.buffer);
          // Atualizar usuário com URL pública
          const publicUrl = storage.getPublicUrl(filename);
          updated = await this.service.updateLogoUrl(id, publicUrl);
        } catch (e) {
          // Se der erro ao salvar em disco, cair para o modo binário no banco
          updated = await this.service.updateLogoBinary(
            id,
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
          );
        }
      } else {
        // Fallback: armazenar binário no banco
        updated = await this.service.updateLogoBinary(
          id,
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      }
      
      if (!updated) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        logoUrl: updated.logo
          ? `/users/${updated.id}/logo${updated.logoUpdatedAt ? `?v=${new Date(updated.logoUpdatedAt).getTime()}` : ''}`
          : (updated.logoUrl || null),
        createdAt: updated.createdAt,
      });
    } catch (error: unknown) {
      console.error('Erro ao fazer upload do logo:', error);
      const err = error as Error;
      res.status(400).json({ message: err.message || 'Erro ao fazer upload do logo' });
    }
  };

  /**
   * GET /users/:id/logo - Retornar a imagem do usuário diretamente
   */
  public getLogo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.service.findOne(id);
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      if (!user.logo || !user.logoContentType) {
        res.status(404).json({ message: 'Usuário não possui logo' });
        return;
      }

      res.setHeader('Content-Type', user.logoContentType);
      if (user.logoFilename) {
        res.setHeader('Content-Disposition', `inline; filename="${user.logoFilename}"`);
      }
      // Evitar cache incorreto entre usuários: obrigar revalidação e variar por versão
      const version = user.logoUpdatedAt ? new Date(user.logoUpdatedAt).getTime() : 0;
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('ETag', `${user.id}-${version}`);
      if (user.logoUpdatedAt) {
        res.setHeader('Last-Modified', new Date(user.logoUpdatedAt).toUTCString());
      }
      res.send(user.logo);
    } catch (error: unknown) {
      console.error('Erro ao servir logo do usuário:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao obter logo do usuário' });
    }
  };

  /**
   * DELETE /users/:id/logo - Remover a imagem do usuário (limpar logo binário e URL pública)
   */
  public deleteLogo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.service.findOne(id);
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      // Se houver arquivo público em /uploads, tentar remover
      if (user.logoUrl && user.logoUrl.startsWith('/uploads/')) {
        try {
          const uploadsDir = require('path').join(process.cwd(), 'gerrot-backend', 'uploads');
          const rel = user.logoUrl.replace('/uploads/', '');
          const filePath = require('path').join(uploadsDir, rel);
          const fs = await import('fs');
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // Ignorar erros ao tentar remover arquivo
        }
      }

      const cleared = await this.service.clearLogo(id);
      if (!cleared) {
        res.status(500).json({ message: 'Não foi possível remover a imagem do usuário' });
        return;
      }

      res.status(200).json({
        id: cleared.id,
        email: cleared.email,
        name: cleared.name,
        logoUrl: null,
        createdAt: cleared.createdAt,
      });
    } catch (error: unknown) {
      console.error('Erro ao remover logo do usuário:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao remover imagem do usuário' });
    }
  };

  /**
   * DELETE /users/:id - Deletar usuário
   */
  public remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // Validação de ObjectId para evitar 500 desnecessário
      const { ObjectId } = await import('mongodb');
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'invalid id' });
        return;
      }
      const success = await this.service.remove(id);
      
      if (!success) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      console.error('Erro ao deletar usuário:', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao deletar usuário' });
    }
  };

  /**
   * DELETE /users?id=... - Alias por query param para deletar usuário
   */
  public removeByQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String((req.query as any).id || '');
      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }
      const { ObjectId } = await import('mongodb');
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ message: 'invalid id' });
        return;
      }
      const success = await this.service.remove(id);
      if (!success) {
        res.status(404).json({ message: 'Usuário não encontrado' });
        return;
      }
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Erro ao deletar usuário (query):', error);
      const err = error as Error;
      res.status(500).json({ message: err.message || 'Erro ao deletar usuário' });
    }
  };
}
