import { Entity, ObjectIdColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('script_versions')
export class ScriptVersion {
  @ObjectIdColumn()
  id!: string;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ nullable: true })
  generatedPdfUrl!: string | null; // URL do PDF gerado (ex: "https://s3.bucket.../roteiro-v1.pdf")

  // IMPORTANTE: Em MongoDB, relações ManyToOne do TypeORM não populam automaticamente.
  // Manteremos o campo relacional (para compatibilidade futura), mas persistiremos também o projectId simples.
  @ManyToOne(() => Project, (project) => project.versions, { onDelete: 'CASCADE' })
  project!: Project;

  // Referência direta ao projeto para buscas estáveis no MongoDB
  @Column({ type: 'text' })
  projectId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}