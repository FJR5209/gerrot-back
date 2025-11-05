import { Entity, ObjectIdColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Project } from '../../4-projects/entities/project.entity';

// Entidade: User
// Coleção: 'users'

@Entity('users')
export class User {
  @ObjectIdColumn()
  id!: string; // ObjectId do MongoDB

  @Column({ unique: true })
  email!: string; // Email de login

  @Column()
  name!: string; // Nome do gerente

  @Column({ select: false }) // Não retorna a senha em queries por padrão
  passwordHash!: string;

  // Mantido para compatibilidade, mas não será mais usado para novos uploads
  @Column({ nullable: true })
  logoUrl!: string | null; // URL antiga (quando salvo em filesystem)

  // Novo: armazenar a foto no banco (Mongo) como binário
  @Column({ nullable: true })
  logo?: Buffer | null;

  @Column({ nullable: true })
  logoContentType?: string | null; // ex: image/png

  @Column({ nullable: true })
  logoFilename?: string | null; // nome original/sanitizado

  @Column({ nullable: true })
  logoUpdatedAt?: Date | null;

  // Relacionamento: Um usuário pode ter muitos projetos
  @OneToMany(() => Project, (project: Project) => project.owner)
  projects!: Project[];

  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Método toJSON para remover campos sensíveis ao serializar
   * CRÍTICO: Remove passwordHash e logo binário antes de enviar ao cliente
   */
  toJSON() {
    const { passwordHash, logo, ...safeUser } = this as any;
    return safeUser;
  }
}