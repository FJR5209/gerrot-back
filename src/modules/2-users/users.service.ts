import { User } from './entities/user.entity';
import { getDataSource } from '../../common/database';
import { ObjectId } from 'mongodb';
type Repository<T> = any;

export class UsersService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = getDataSource().getRepository(User);
  }

  /**
   * Listar todos os usuários
   */
  public async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Buscar usuário por ID
   */
  public async findOne(id: string): Promise<User | null> {
    try {
      const objectId = new ObjectId(id);
      const user = await this.userRepository.findOne({
        where: { _id: objectId },
      });
      return user || null;
    } catch (error) {
      // Log apenas erro crítico
      return null;
    }
  }

  /**
   * Buscar usuário por email (com senha para autenticação)
   */
  public async findByEmail(email: string): Promise<User | null> {
    const dataSource = getDataSource();
    const users = await dataSource.manager.find(User, {
      where: { email } as any,
    });
    return users[0] || null;
  }

  /**
   * Criar novo usuário
   */
  public async create(data: Partial<User>): Promise<User> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    const user = new User();
    Object.assign(user, data);
    
    const savedUser = await manager.save(User, user);
  // Log removido
    return savedUser;
  }

  /**
   * Atualizar usuário
   */
  public async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const existing = await this.findOne(id);
      if (!existing) return null;
      Object.assign(existing, data);
      await this.userRepository.save(existing);
      return this.findOne(id);
    } catch (error) {
      // Log apenas erro crítico
      return null;
    }
  }

  /**
   * Atualizar logo do usuário
   */
  public async updateLogoBinary(
    id: string,
    buffer: Buffer,
    contentType: string,
    filename: string
  ): Promise<User | null> {
    try {
      const existing = await this.findOne(id);
      if (!existing) return null;
      existing.logo = buffer;
      existing.logoContentType = contentType;
      existing.logoFilename = filename;
      existing.logoUpdatedAt = new Date();
      existing.logoUrl = null; // limpar URL antiga
      await this.userRepository.save(existing);
      return this.findOne(id);
    } catch (error) {
      // Log apenas erro crítico
      return null;
    }
  }

  /**
   * Atualizar logo do usuário via URL pública (arquivo salvo em /uploads)
   */
  public async updateLogoUrl(
    id: string,
    logoUrl: string
  ): Promise<User | null> {
    try {
      const existing = await this.findOne(id);
      if (!existing) return null;
      existing.logoUrl = logoUrl;
      existing.logo = null;
      existing.logoContentType = null;
      existing.logoFilename = null;
      existing.logoUpdatedAt = new Date();
      await this.userRepository.save(existing);
      return this.findOne(id);
    } catch (error) {
      // Log apenas erro crítico
      return null;
    }
  }

  /**
   * Limpar/remover logo do usuário (tanto binário quanto URL pública)
   */
  public async clearLogo(id: string): Promise<User | null> {
    try {
      const existing = await this.findOne(id);
      if (!existing) return null;
      existing.logo = null;
      existing.logoContentType = null;
      existing.logoFilename = null;
      existing.logoUrl = null;
      existing.logoUpdatedAt = new Date();
      await this.userRepository.save(existing);
      return this.findOne(id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Deletar usuário
   */
  public async remove(id: string): Promise<boolean> {
    try {
      const objectId = new ObjectId(id);
      const result = await this.userRepository.delete({ _id: objectId });
      return result.affected === 1;
    } catch (error) {
      // Log apenas erro crítico
      return false;
    }
  }
}
