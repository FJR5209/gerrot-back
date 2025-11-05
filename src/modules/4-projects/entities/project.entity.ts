import { Entity, ObjectIdColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../2-users/entities/user.entity';
import { Client } from '../../3-clients/entities/client.entity';
import { ScriptVersion } from './script-version.entity';

// Entidade: Project
// Tabela: 'projects'

// Enum para os tipos de roteiro (Requisito A3)
export enum ScriptType {
    SOCIAL_MEDIA = 'social_media',
    INTERNAL = 'internal',
    TV_COMMERCIAL = 'tv_commercial',
  }
  
  @Entity('projects')
  export class Project {
    @ObjectIdColumn()
    id!: string;
  
    @Column()
    title!: string; // Título do roteiro (ex: "Campanha Dia das Mães")
  
    @Column({
      type: 'enum',
      enum: ScriptType,
      default: ScriptType.SOCIAL_MEDIA,
    })
    scriptType!: ScriptType; // "VT", "Rede Social", "Interno"
  
    // --- Campos auxiliares para MongoDB (garantir que IDs sejam armazenados) ---
    @Column({ nullable: true })
    clientId!: string | null; // ID do cliente (para facilitar busca no MongoDB)
  
    @Column({ nullable: true })
    ownerId!: string | null; // ID do owner (para facilitar busca no MongoDB)
  
    // --- Auditoria: rastreamento de criação e modificação ---
    @Column({ nullable: true })
    createdBy!: string | null; // ID do usuário que criou o projeto
  
    @Column({ nullable: true })
    createdByName!: string | null; // Nome do usuário que criou (para facilitar exibição)
  
    @Column({ nullable: true })
    lastModifiedBy!: string | null; // ID do último usuário que modificou
  
  @Column({ nullable: true })
  lastModifiedByName!: string | null; // Nome do último usuário que modificou

  // --- Campos de Agenda ---

  @Column({ type: 'date', nullable: true })
  recordingDate!: Date | null; // Data da gravação

  @Column({ type: 'date', nullable: true })
  deliveryDeadline!: Date | null; // Prazo de entrega

  @Column({ nullable: true })
  estimatedDuration!: number | null; // Duração estimada em minutos

  @Column({ nullable: true })
  location!: string | null; // Local da gravação

  @Column({ nullable: true })
  notes!: string | null; // Observações sobre a gravação

  // --- Relacionamentos Chave ---

  // Relacionamento com o Dono (Usuário)
  @ManyToOne(() => User, (user: User) => user.projects, { eager: true }) // eager: sempre traz o usuário junto
  owner!: User;    // Relacionamento com o Cliente (para quem é o roteiro)
    @ManyToOne(() => Client, (client: Client) => client.projects, { eager: true })
    client!: Client;
  
    // Relacionamento com as Versões (o histórico)
    @OneToMany(() => ScriptVersion, (version: ScriptVersion) => version.project)
    versions!: ScriptVersion[];
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }