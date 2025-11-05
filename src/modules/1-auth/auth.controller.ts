import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { RegisterDto } from '../../common/dto/register.dto';
import { LoginDto } from '../../common/dto/login.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { getDataSource } from '../../common/database';
import { User } from '../2-users/entities/user.entity';
type Repository<T> = any;

export class AuthController {
  private authService: AuthService;
  private localStrategy: LocalStrategy;

  constructor() {
    this.authService = new AuthService();
    this.localStrategy = new LocalStrategy();
  }

  private getUserRepository(): Repository<User> {
    const dataSource = getDataSource();
    // Para MongoDB, pode precisar usar manager diretamente
    return dataSource.getRepository(User);
  }

  /**
   * POST /auth/register
   * Registra um novo usuário
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = plainToClass(RegisterDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      // Verificar se email já existe
      const userRepository = this.getUserRepository();
      const existingUser = await userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        res.status(409).json({ message: 'Email já está em uso' });
        return;
      }

      // Criar novo usuário
      const passwordHash = await this.authService.hashPassword(dto.password);
      
      // Tentar usar manager diretamente para MongoDB
      const dataSource = getDataSource();
      const user = new User();
      user.email = dto.email;
      user.name = dto.name;
      user.passwordHash = passwordHash;
      
      // Usar manager.save ao invés de repository.save para MongoDB
      const savedUser = await dataSource.manager.save(User, user);

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        message: 'Usuário criado com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao registrar usuário:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message || 'Erro desconhecido'
      });
    }
  };

  /**
   * POST /auth/login
   * Autentica usuário e retorna token JWT
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = plainToClass(LoginDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((e: any) => Object.values(e.constraints || {})).flat();
        res.status(400).json({ message: 'Dados inválidos', errors: errorMessages });
        return;
      }

      // Validar credenciais
      const result = await this.localStrategy.validate(dto.email, dto.password);

      if (!result) {
        res.status(401).json({ message: 'Email ou senha inválidos' });
        return;
      }

      // Gerar token JWT incluindo o nome do usuário
      const accessToken = this.authService.generateJwt(result.userId, result.email, result.name);

      res.json({
        accessToken,
        user: {
          userId: result.userId,
          email: result.email,
          name: result.name,
        },
      });
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}
