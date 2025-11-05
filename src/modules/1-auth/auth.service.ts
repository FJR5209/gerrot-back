import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigModule } from '../../common/config/config.module';
import { User } from '../2-users/entities/user.entity';
import { getDataSource } from '../../common/database';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TypeORM = require('typeorm');
type Repository<T> = any; // TypeORM.Repository<T>;

export interface JwtPayload {
  userId: string;
  email: string;
  name?: string; // Adicionar nome para facilitar auditoria
}

export class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = getDataSource().getRepository(User);
  }

  /**
   * Valida credenciais do usuário
   */
  public async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'passwordHash', 'createdAt'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Remover passwordHash antes de retornar
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Gera token JWT
   */
  public generateJwt(userId: string, email: string, name?: string): string {
    const secret = ConfigModule.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET não configurado no .env');
    }

    const expiresIn = ConfigModule.get<string>('JWT_EXPIRES_IN', '7d');

    const payload: JwtPayload = {
      userId,
      email,
      name, // Incluir nome no token para auditoria
    };

    // @ts-ignore - jsonwebtoken types issue
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verifica e decodifica token JWT
   */
  public verifyToken(token: string): JwtPayload | null {
    try {
      const secret = ConfigModule.get<string>('JWT_SECRET');
      if (!secret) {
        return null;
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash de senha
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Busca usuário por ID
   */
  public async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'createdAt'],
    });
  }
}
