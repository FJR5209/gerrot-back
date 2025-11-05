import { Request, Response } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from '../../common/dto/create-client.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

export class ClientsController {
  private readonly service = new ClientsService();

  public create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const dto = plainToClass(CreateClientDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      const client = await this.service.create({ name: dto.name });
      res.status(201).json(client);
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ message: error.message || 'Erro interno do servidor' });
    }
  };

  public list = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const clients = await this.service.findAll();
      res.json(clients);
    } catch (error: any) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const client = await this.service.findOne(id);
      if (!client) {
        res.status(404).json({ message: 'Cliente não encontrado' });
        return;
      }
      res.json(client);
    } catch (error: any) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  public update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto = plainToClass(CreateClientDto, req.body);
      const errors = await validate(dto, { skipMissingProperties: true });

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      const updated = await this.service.update(id, { name: dto.name });
      if (!updated) {
        res.status(404).json({ message: 'Cliente não encontrado' });
        return;
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ message: error.message || 'Erro interno do servidor' });
    }
  };

  public remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const ok = await this.service.remove(id);
      if (!ok) {
        res.status(404).json({ message: 'Cliente não encontrado' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Erro ao remover cliente:', error);
      if (error.message && error.message.includes('projetos associados')) {
        res.status(409).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };

  public updateLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: 'Arquivo não enviado. Envie uma imagem no campo "file"' });
        return;
      }
      const publicUrl = req.storage.getPublicUrl(file.filename);
      const updated = await this.service.updateLogo(id, publicUrl);
      if (!updated) {
        res.status(404).json({ message: 'Cliente não encontrado' });
        return;
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar logo:', error);
      res.status(400).json({ message: error.message || 'Erro ao fazer upload do logo' });
    }
  };
}
