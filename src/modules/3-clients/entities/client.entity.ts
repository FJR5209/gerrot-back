import { Entity, ObjectIdColumn, Column, OneToMany } from 'typeorm';
import { Project } from '../../4-projects/entities/project.entity';

// Entidade: Client
// Tabela: 'clients'

@Entity('clients')
export class Client {
  @ObjectIdColumn()
  id!: string;

  @Column()
  name!: string; // Nome do cliente (ex: "Acme Inc.")

  @Column({ nullable: true })
  logoUrl!: string | null; // URL do logo (ex: "https://storage.s3.com/logo-acme.png")
  
  // (O logo da sua agência pode ser uma variável de ambiente ou
  // uma entrada especial nesta mesma tabela)

  // Relacionamento: Um cliente pode ter muitos projetos
  @OneToMany(() => Project, (project: Project) => project.client)
  projects!: Project[];
}