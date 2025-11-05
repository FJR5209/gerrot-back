import { Project, ScriptType } from './entities/project.entity';
import { ClientsService } from '../3-clients/clients.service';
import { User } from '../2-users/entities/user.entity';
import { getDataSource } from '../../common/database';
type Repository<T> = any;

export class ProjectsService {
  private projectRepository: Repository<Project>;
  private clientsService: ClientsService;

  constructor() {
    this.projectRepository = getDataSource().getRepository(Project);
    this.clientsService = new ClientsService();
  }

  /**
   * SEGURANÇA: Sanitiza objeto User removendo campos sensíveis
   * Remove passwordHash, logo binário e outros dados que não devem ser expostos
   */
  private sanitizeUser(user: User | null): any {
    if (!user) return null;
    
    const userAny = user as any;
    
    // Se já está sanitizado (não tem passwordHash), retornar como está
    if (!userAny.passwordHash && !userAny.logo) {
      return user;
    }
    
    // Criar objeto limpo apenas com campos seguros
    return {
      id: userAny.id || userAny._id,
      email: userAny.email,
      name: userAny.name,
      logoUrl: userAny.logoUrl || null,
      createdAt: userAny.createdAt,
    };
  }

  private async findByIdFlexible(id: string): Promise<Project | null> {
    // Normalizar possíveis formatos de ObjectId vindos do MongoDB
    const cleanId = String(id)
      .replace(/^new ObjectId\(['"]|['"]\)$/g, '')
      .replace(/^ObjectId\(|\)$/g, '')
      .trim();

    const dataSource = getDataSource();
    const manager = dataSource.manager;

    // 1) Tentar busca direta via manager (mais confiável no MongoDB)
    let project = await manager.findOne(Project, { where: { id: cleanId } as any });
    if (project) return project;

    // 2) Tentar via repository
    project = await this.projectRepository.findOne({ where: { id: cleanId } as any });
    if (project) return project;

    // 3) Listar todos e comparar por string (robusto para variações do ObjectId)
    const all = await manager.find(Project);
    project = all.find((p: Project) => String((p as any).id) === String(cleanId)) || null;
    if (project) return project;

    return null;
  }

  /**
   * Normaliza os campos de auditoria (createdByName/lastModifiedByName)
   * - Se o nome estiver vazio ou com email (contém '@'), tenta resolver pelo usuário
   * - Usa um mapa de usuários para performance; se não fornecido, carrega todos
   * - Opcionalmente persiste se houver mudança
   */
  private async normalizeAuditNames(
    project: Project,
    opts?: {
      usersMap?: Map<string, { id: string; name?: string; email: string }>;
      emailsMap?: Map<string, { id: string; name?: string; email: string }>;
      persist?: boolean;
    }
  ): Promise<void> {
    try {
      const dataSource = getDataSource();
      const manager = dataSource.manager;

      // Obter mapas de usuários (id -> {name,email}) e (email -> {name,email})
      let usersMap = opts?.usersMap;
      let emailsMap = opts?.emailsMap;
      if (!usersMap || !emailsMap) {
        const allUsers = await manager.find(User);
        usersMap = usersMap || new Map(
          allUsers.map((u: any) => [String(u.id), { id: String(u.id), name: u.name, email: u.email }])
        );
        emailsMap = emailsMap || new Map(
          allUsers
            .filter((u: any) => !!u.email)
            .map((u: any) => [String(u.email).toLowerCase(), { id: String(u.id), name: u.name, email: u.email }])
        );
      }

      let changed = false;

      // Helpers de resolução de nome
      const resolveNameById = (userId?: string | null): string | null => {
        if (!userId) return null;
        const key = String(userId);
        const u = usersMap!.get(key);
        if (u) return (u.name && String(u.name).trim()) || u.email || null;
        return null;
      };
      const resolveNameByEmail = (email?: string | null): string | null => {
        if (!email) return null;
        const u = emailsMap!.get(String(email).toLowerCase());
        if (u) return (u.name && String(u.name).trim()) || u.email || null;
        return null;
      };

      // createdByName
      if (!project.createdByName || (typeof project.createdByName === 'string' && project.createdByName.includes('@'))) {
        let name = resolveNameById(project.createdBy);
        if (!name && project.createdByName && project.createdByName.includes('@')) {
          name = resolveNameByEmail(project.createdByName);
        }
        if (!name && (project as any).owner && project.createdBy && String(project.createdBy) === String(((project as any).owner as any).id)) {
          name = ((project as any).owner as any).name || null;
        }
        if (name && name !== project.createdByName) {
          project.createdByName = name;
          changed = true;
        }
      }

      // lastModifiedByName
      if (!project.lastModifiedByName || (typeof project.lastModifiedByName === 'string' && project.lastModifiedByName.includes('@'))) {
        let name = resolveNameById(project.lastModifiedBy);
        if (!name && project.lastModifiedByName && project.lastModifiedByName.includes('@')) {
          name = resolveNameByEmail(project.lastModifiedByName);
        }
        if (!name && (project as any).owner && project.lastModifiedBy && String(project.lastModifiedBy) === String(((project as any).owner as any).id)) {
          name = ((project as any).owner as any).name || null;
        }
        if (name && name !== project.lastModifiedByName) {
          project.lastModifiedByName = name;
          changed = true;
        }
      }

      if (changed && opts?.persist) {
        try {
          await manager.save(Project, project);
        } catch (e) {
          // Não falhar a requisição por falha de persistência do backfill
          console.warn('⚠️  Falha ao persistir normalização de auditoria:', (e as any)?.message || e);
        }
      }
    } catch (e) {
      // Não interromper fluxo por causa da normalização
      console.warn('⚠️  Erro ao normalizar campos de auditoria:', (e as any)?.message || e);
    }
  }

  public async create(data: {
    title: string;
    scriptType: ScriptType;
    clientId: string;
    ownerId: string; // Agora obrigatório, vem do JWT
    recordingDate?: string;
    deliveryDeadline?: string;
    estimatedDuration?: number;
    location?: string;
    notes?: string;
  }): Promise<Project> {
    // Validar se o cliente existe
    const client = await this.clientsService.findOne(data.clientId);
    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    // Validar se o usuário existe (usando workaround para MongoDB)
    const userRepository = getDataSource().getRepository(User);
    const dataSourceUser = getDataSource();
    const managerUser = dataSourceUser.manager;
    
    // Tentar com manager primeiro (mais confiável para MongoDB)
    let owner = await managerUser.findOne(User, {
      where: { id: data.ownerId } as any,
    });
    
    // Se não encontrou, tentar com repository
    if (!owner) {
      owner = await userRepository.findOne({ where: { id: data.ownerId } });
    }
    
    // Se ainda não encontrou, listar todos e filtrar (workaround final)
    if (!owner) {
      const allUsers = await userRepository.find();
      owner = allUsers.find((u: User) => String(u.id) === String(data.ownerId)) || null;
    }
    
    if (!owner) {
      console.error('❌ Usuário não encontrado com ID:', data.ownerId);
      throw new Error('Usuário não encontrado');
    }
    
    console.log('✅ Usuário encontrado:', owner.id);

    // Validar scriptType
    if (!Object.values(ScriptType).includes(data.scriptType)) {
      throw new Error(`Tipo de roteiro inválido. Opções: ${Object.values(ScriptType).join(', ')}`);
    }

    // Usar manager.save para MongoDB (como no auth.controller e clients)
    const dataSourceProject = getDataSource();
    const managerProject = dataSourceProject.manager;
    
    const project = new Project();
    project.title = data.title.trim();
    project.scriptType = data.scriptType;
    project.client = client; // Garantir que client está atribuído
    project.owner = owner; // Garantir que owner está atribuído
    project.clientId = client.id; // Salvar clientId explicitamente (para MongoDB)
    project.ownerId = owner.id; // Salvar ownerId explicitamente (para MongoDB)
    project.versions = [];
    
    // Auditoria: registrar quem criou
    project.createdBy = owner.id;
    project.createdByName = owner.name || owner.email;
    project.lastModifiedBy = owner.id;
    project.lastModifiedByName = owner.name || owner.email;

    // Agenda: atribuir campos se fornecidos
    if (data.recordingDate) {
      project.recordingDate = new Date(data.recordingDate);
    }
    if (data.deliveryDeadline) {
      project.deliveryDeadline = new Date(data.deliveryDeadline);
    }
    if (data.estimatedDuration !== undefined) {
      project.estimatedDuration = data.estimatedDuration;
    }
    if (data.location) {
      project.location = data.location.trim();
    }
    if (data.notes) {
      project.notes = data.notes.trim();
    }
    
    const savedProject = await managerProject.save(Project, project);
    
    // MongoDB pode não salvar campos auxiliares automaticamente, então fazer update manual se necessário
    const savedProjectRaw = await managerProject.findOne(Project, {
      where: { id: savedProject.id } as any,
    });
    
    // Se clientId não foi salvo, fazer update manual usando save (mais confiável para MongoDB)
    if (savedProjectRaw && !(savedProjectRaw as any)?.clientId && project.clientId) {
      console.warn('⚠️  clientId não foi salvo automaticamente. Fazendo update manual...');
      // MongoDB: usar save com o objeto completo (mais confiável que update)
      (savedProjectRaw as any).clientId = project.clientId;
      (savedProjectRaw as any).ownerId = project.ownerId;
      const updatedProject = await managerProject.save(Project, savedProjectRaw);
      if (updatedProject) {
        Object.assign(savedProject, updatedProject);
        console.log('   ✅ clientId e ownerId atualizados manualmente');
      }
    }
    
    // Verificar se clientId foi realmente salvo após todas as tentativas
    const finalProject = await managerProject.findOne(Project, {
      where: { id: savedProject.id } as any,
    });
    
    const finalClientId = (finalProject as any)?.clientId || savedProject.clientId || project.clientId;
    const finalOwnerId = (finalProject as any)?.ownerId || savedProject.ownerId || project.ownerId;
    
    // Garantir que clientId está no objeto retornado (CRÍTICO para funcionamento)
    if (!savedProject.clientId) {
      savedProject.clientId = finalClientId;
      (savedProject as any).clientId = finalClientId;
    }
    if (!savedProject.ownerId) {
      savedProject.ownerId = finalOwnerId;
      (savedProject as any).ownerId = finalOwnerId;
    }
    
    console.log('✅ Projeto salvo:', {
      id: savedProject.id,
      title: savedProject.title,
      hasClient: !!savedProject.client,
      hasOwner: !!savedProject.owner,
      clientIdSalvo: savedProject.clientId || 'NÃO SALVO ⚠️',
      ownerIdSalvo: savedProject.ownerId || 'NÃO SALVO ⚠️',
      clientIdNoBanco: finalClientId || 'NÃO ENCONTRADO ❌',
    });
    
    // AVISO CRÍTICO se clientId não foi salvo
    if (!finalClientId) {
      console.error('❌ ERRO CRÍTICO: clientId NÃO foi salvo no banco de dados!');
      console.error('   Isso impedirá a geração de PDF para este projeto.');
      console.error('   clientId que tentamos salvar:', project.clientId);
    }
    
    return savedProject;
  }

  public async findAll(ownerId?: string): Promise<Project[]> {
    console.log('🔍 Buscando todos os projetos...');
    if (ownerId) {
      console.log('   Filtrando por ownerId:', ownerId);
    }
    
    // MongoDB não suporta QueryBuilder, usar find diretamente
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    // Buscar todos os projetos (não usar relations pois em MongoDB isso pode falhar)
    let allProjects = await manager.find(Project);
    console.log(`📋 Total de projetos encontrados: ${allProjects.length}`);
    
    // Se há filtro por ownerId, filtrar manualmente e limpar dados
    if (ownerId) {
      allProjects = allProjects.filter((p: Project) => {
        // Tentar extrair ownerId de várias formas possíveis
        const projectOwnerId = String(
          p.ownerId || 
          p.owner?.id || 
          (typeof p.owner === 'string' ? p.owner : null) ||
          (p as any).owner?._id || 
          (p as any).ownerId || 
          ''
        ).trim();
        
        const searchOwnerId = String(ownerId).trim();
        const match = projectOwnerId === searchOwnerId;
        
        if (!match) {
          console.log(`   ⚠️ Projeto ${p.id} não corresponde ao owner (${projectOwnerId} !== ${searchOwnerId})`);
        }
        
        return match;
      });
      console.log(`   ✅ ${allProjects.length} projetos encontrados para o owner`);
    }
    
    // Ordenar por updatedAt (mais recente primeiro)
    allProjects.sort((a: Project, b: Project) => {
      const dateA = a.updatedAt?.getTime() || 0;
      const dateB = b.updatedAt?.getTime() || 0;
      return dateB - dateA; // DESC
    });
    
    // Carregar todos os usuários uma vez para acelerar normalização/carregamento de owner
    const allUsers = await manager.find(User);
    const usersMap: Map<string, { id: string; name?: string; email: string }> = new Map(
      (allUsers as any[]).map((u: any) => [String(u.id), { id: String(u.id), name: u.name, email: u.email }])
    );
    const emailsMap: Map<string, { id: string; name?: string; email: string }> = new Map(
      (allUsers as any[])
        .filter((u: any) => !!u.email)
        .map((u: any) => [String(u.email).toLowerCase(), { id: String(u.id), name: u.name, email: u.email }])
    );

    // Garantir que client e owner estejam carregados para cada projeto
    for (const project of allProjects) {
      try {
        // Carregar client se necessário
        if (!project.client || !(project.client as any)?.name) {
          console.log(`   🔄 Carregando client para projeto ${project.id}...`);
          
          // 1. Tentar obter clientId de várias formas
          let clientId = project.clientId || 
                        (project as any)?.clientId || 
                        (project as any)?.client?._id ||
                        (typeof project.client === 'string' ? project.client : null);
                        
          // 2. Se ainda não encontrou, usar extractor
          if (!clientId) {
            clientId = this.extractClientId(project as any);
          }
          
          if (clientId) {
            // Limpar formato do MongoDB ObjectId
            const cleaned = String(clientId)
              .replace(/^new ObjectId\(['"]|['"]\)$/g, '')
              .replace(/^ObjectId\(|\)$/g, '')
              .trim();
              
            console.log(`   🔍 Buscando client com ID: ${cleaned}...`);
            const loadedClient = await this.clientsService.findOne(cleaned as string);
            
            if (loadedClient) {
              project.client = loadedClient;
              project.clientId = loadedClient.id;
              console.log(`   ✅ Client carregado: ${loadedClient.name}`);
            } else {
              console.warn(`   ⚠️ Client não encontrado para ID: ${cleaned}`);
            }
          } else {
            console.warn(`   ⚠️ Não foi possível extrair clientId do projeto ${project.id}`);
          }
        }

        // Carregar owner se necessário
        if (!project.owner) {
          console.log(`   🔄 Carregando owner para projeto ${project.id}...`);
          
          const projectRaw: any = project as any;
          // Tentar extrair ownerId de várias formas possíveis
          const ownerIdField = projectRaw.ownerId || 
                             project.ownerId ||
                             (projectRaw.owner && (
                               typeof projectRaw.owner === 'string' ? 
                               projectRaw.owner : 
                               projectRaw.owner.id || projectRaw.owner._id
                             ));
                             
          if (ownerIdField) {
            const cleanOwnerId = String(ownerIdField)
              .replace(/^new ObjectId\(['"]|['"]\)$/g, '')
              .replace(/^ObjectId\(|\)$/g, '')
              .trim();
              
            console.log(`   🔍 Buscando owner com ID: ${cleanOwnerId}...`);
            // Usar o mapa pré-carregado de usuários
            const foundOwner = allUsers.find((u: any) => String(u.id) === String(cleanOwnerId)) || null;
            
            if (foundOwner) {
              // SEGURANÇA: Sanitizar owner antes de atribuir
              project.owner = this.sanitizeUser(foundOwner) as any;
              project.ownerId = cleanOwnerId;
              console.log(`   ✅ Owner carregado: ${foundOwner.email || cleanOwnerId}`);
            } else {
              console.warn(`   ⚠️ Owner não encontrado para ID: ${cleanOwnerId}`);
            }
          } else {
            console.warn(`   ⚠️ Não foi possível extrair ownerId do projeto ${project.id}`);
          }
        } else {
          // SEGURANÇA: Sanitizar owner se já estava carregado
          project.owner = this.sanitizeUser(project.owner) as any;
        }

        // Normalizar campos de auditoria e tentar persistir caso mude
        await this.normalizeAuditNames(project, { usersMap, emailsMap, persist: true });
      } catch (e) {
        // não falhar a listagem inteira por causa de um projeto com problema
        console.warn('⚠️  Falha ao carregar relações para um projeto:', (e as any)?.message || e);
      }
    }

    return allProjects;
  }

  /**
   * Função auxiliar para extrair clientId de um projeto (MongoDB pode armazenar de várias formas)
   */
  private extractClientId(project: any): string | null {
    if (!project) return null;
    
    // Tentar pegar de várias formas que MongoDB pode armazenar
    if (project.clientId) {
      return String(project.clientId);
    }
    
    if (project.client) {
      if (typeof project.client === 'string') {
        return project.client;
      }
      if (project.client.id) {
        return String(project.client.id);
      }
      if (typeof project.client === 'object' && project.client._id) {
        return String(project.client._id);
      }
    }
    
    // MongoDB pode armazenar como ObjectId em formato especial
    if ((project as any).client) {
      const clientRef = (project as any).client;
      if (typeof clientRef === 'string') {
        return clientRef;
      }
      if (clientRef && clientRef.toString) {
        return clientRef.toString();
      }
    }
    
    return null;
  }

  /**
   * Busca o clientId de projetos antigos que não têm o campo clientId salvo
   * Como solução alternativa, busca todos os projetos e tenta encontrar o relacionamento
   */
  private async getClientIdFromMongo(projectId: string): Promise<string | null> {
    try {
      // SOLUÇÃO ALTERNATIVA: Como projetos antigos podem não ter clientId salvo,
      // mas ainda ter o relacionamento client armazenado de alguma forma,
      // vamos listar todos os projetos e encontrar aquele que foi criado na mesma sessão
      // ou usar uma abordagem diferente
      
      console.log('   ⚠️  Buscando clientId em projetos similares...');
      
      const dataSource = getDataSource();
      const manager = dataSource.manager;
      
      // Listar TODOS os projetos e encontrar aquele que pode ter sido criado com o mesmo client
      const allProjects = await manager.find(Project);
      
      // Projeto atual
      const currentProject = allProjects.find((p: Project) => String(p.id) === String(projectId));
      
      if (!currentProject) {
        console.log('   ⚠️  Projeto não encontrado na lista de projetos');
        return null;
      }
      
      // Se o projeto foi encontrado mas não tem clientId, vamos tentar encontrar
      // qual client foi usado na criação verificando projetos criados na mesma época
      // ou projetos com o mesmo título (podem ter sido criados juntos)
      
      // Para projetos muito antigos sem clientId, a melhor solução é exigir
      // que o usuário recrie o projeto ou façamos uma migração manual
      
      console.log('   ⚠️  Projeto antigo sem clientId. É necessário recriar o projeto ou fazer migração manual.');
      console.log('   💡 Sugestão: Crie um novo projeto para garantir que clientId seja salvo.');
      
      return null;
    } catch (error: any) {
      console.error('   ❌ Erro ao buscar clientId do MongoDB:', error.message);
      return null;
    }
  }

  public async findOne(id: string): Promise<Project | null> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    console.log('🔍 Buscando projeto com ID:', id);
    
    // Buscar projeto (sem relations primeiro para ver estrutura raw)
    let project = await manager.findOne(Project, {
      where: { id } as any,
    });
    
    // Se não encontrou, tentar listar todos
    if (!project) {
      const allProjects = await manager.find(Project);
      project = allProjects.find((p: Project) => String(p.id) === String(id)) || null;
    }
    
    if (!project) {
      console.log('❌ Projeto não encontrado');
      return null;
    }
    
    console.log('✅ Projeto encontrado');
    
    // Buscar projeto RAW do MongoDB para ver todos os campos
    const projectRawAny = project as any;
    console.log('   Projeto raw completo:', JSON.stringify({
      id: project.id,
      title: project.title,
      clientId: projectRawAny.clientId || project.clientId,
      ownerId: projectRawAny.ownerId || project.ownerId,
      client: projectRawAny.client,
      owner: projectRawAny.owner,
      todasKeys: Object.keys(projectRawAny),
    }, null, 2));
    
    // SEMPRE carregar client manualmente (MongoDB eager pode não funcionar)
    if (!project.client || !(project.client as any)?.name) {
      console.warn('⚠️  Client não carregado automaticamente. Buscando usando clientId...');
      
      // Tentar obter clientId de várias formas
      let clientId: string | null = null;
      
      // 1. Campo clientId direto (que salvamos explicitamente)
      if (project.clientId) {
        clientId = String(project.clientId);
      } else if (projectRawAny.clientId) {
        clientId = String(projectRawAny.clientId);
      }
      
      // 2. Tentar extrair do objeto client se existir
      if (!clientId && projectRawAny.client) {
        if (typeof projectRawAny.client === 'string') {
          clientId = projectRawAny.client;
        } else if (projectRawAny.client.id) {
          clientId = String(projectRawAny.client.id);
        } else if (projectRawAny.client.toString) {
          clientId = projectRawAny.client.toString();
        }
      }
      
      // 3. Usar função auxiliar como fallback
      if (!clientId) {
        clientId = this.extractClientId(project);
      }
      
      // 4. ÚLTIMO RECURSO: Para projetos antigos sem clientId
      // Se não encontrou clientId, o projeto foi criado antes da adição desse campo
      // Nesse caso, precisamos que o usuário forneça o clientId ou recrie o projeto
      if (!clientId) {
        console.error('   ❌ Projeto antigo sem clientId armazenado.');
        console.error('   💡 Solução: Crie um novo projeto ou atualize este projeto com um clientId válido.');
        console.error('   📝 Projetos criados ANTES de adicionar o campo clientId não podem ter o client carregado automaticamente.');
      }
      
      if (clientId) {
        // Limpar formatação de ObjectId se necessário
        clientId = String(clientId).replace(/^new ObjectId\(['"]|['"]\)$/g, '').trim();
        // Remover ObjectId() wrapper se existir
        clientId = clientId.replace(/^ObjectId\(|\)$/g, '');
        console.log('   ClientId extraído:', clientId);
        
        const loadedClient = await this.clientsService.findOne(clientId);
        
        if (loadedClient) {
          project.client = loadedClient;
          project.clientId = loadedClient.id; // Garantir que clientId está setado
          console.log('   ✅ Client carregado:', (project.client as any)?.name);
          
          // Atualizar o projeto no banco com clientId se ele não tinha (migração para projetos antigos)
          if (!projectRawAny.clientId && !project.clientId) {
            console.warn('   ⚠️  Atualizando projeto antigo com clientId...');
            const projectToUpdate = await manager.findOne(Project, { where: { id } as any });
            if (projectToUpdate) {
              (projectToUpdate as any).clientId = loadedClient.id;
              await manager.save(Project, projectToUpdate);
              console.log('   ✅ Projeto atualizado com clientId');
            }
          }
        } else {
          console.error('   ❌ Client não encontrado com ID:', clientId);
          // Listar todos os clientes para debug
          const allClients = await manager.find(require('../3-clients/entities/client.entity').Client);
          console.log('   Clientes disponíveis:', allClients.map((c: any) => ({
            id: String(c.id).replace(/^new ObjectId\(['"]|['"]\)$/g, ''),
            name: c.name,
          })));
        }
      } else {
        console.error('   ❌ Não foi possível obter clientId do projeto de nenhuma forma');
      }
    } else {
      console.log('✅ Client já estava carregado:', (project.client as any)?.name);
      // Garantir que clientId está setado
      if (!project.clientId && (project.client as any)?.id) {
        project.clientId = String((project.client as any).id);
      }
    }
    
    // Carregar owner se necessário
    if (!project.owner) {
      console.warn('⚠️  Owner não carregado. Buscando...');
      const projectRaw = project as any;
      let ownerId = projectRaw.ownerId || (projectRaw.owner && (typeof projectRaw.owner === 'string' ? projectRaw.owner : projectRaw.owner.id));
      
      if (ownerId) {
        const allUsers = await manager.find(User);
        const foundOwner = allUsers.find((u: User) => String(u.id) === String(ownerId)) || null;
        if (foundOwner) {
          // SEGURANÇA: Sanitizar owner antes de atribuir
          project.owner = this.sanitizeUser(foundOwner) as any;
          console.log('   ✅ Owner carregado');
        }
      }
    } else {
      // SEGURANÇA: Sanitizar owner se já estava carregado
      project.owner = this.sanitizeUser(project.owner) as any;
      if ((project.owner as any)?.id) {
        console.log('   🔒 Owner sanitizado');
      }
    }
    
    // Verificação final crítica
    if (!project.client) {
      console.error('❌ ERRO CRÍTICO: Projeto encontrado mas client NÃO pode ser carregado!');
      console.error('   Isso impedirá a geração de PDF');
    }
    
    return project;
  }

  public async update(
    id: string, 
    data: Partial<Pick<Project, 'title' | 'scriptType' | 'recordingDate' | 'deliveryDeadline' | 'estimatedDuration' | 'location' | 'notes'>>,
    modifiedBy?: { userId: string; userName: string }
  ): Promise<Project | null> {
    const project = await this.findByIdFlexible(id);
    if (!project) return null;

    if (data.title !== undefined) {
      project.title = data.title.trim();
    }
    if (data.scriptType !== undefined) {
      if (!Object.values(ScriptType).includes(data.scriptType)) {
        throw new Error(`Tipo de roteiro inválido. Opções: ${Object.values(ScriptType).join(', ')}`);
      }
      project.scriptType = data.scriptType;
    }

    // Atualizar campos de agenda se fornecidos
    if (data.recordingDate !== undefined) {
      project.recordingDate = data.recordingDate ? new Date(data.recordingDate) : null;
    }
    if (data.deliveryDeadline !== undefined) {
      project.deliveryDeadline = data.deliveryDeadline ? new Date(data.deliveryDeadline) : null;
    }
    if (data.estimatedDuration !== undefined) {
      project.estimatedDuration = data.estimatedDuration;
    }
    if (data.location !== undefined) {
      project.location = data.location ? data.location.trim() : null;
    }
    if (data.notes !== undefined) {
      project.notes = data.notes ? data.notes.trim() : null;
    }

    // Auditoria: registrar quem modificou (com fallback robusto de nome)
    if (modifiedBy) {
      project.lastModifiedBy = modifiedBy.userId;

      let modifierName = modifiedBy.userName;
      // Fallback robusto: se o nome não veio no JWT/req, buscar no banco
      if (!modifierName || modifierName.trim().length === 0) {
        try {
          const dataSource = getDataSource();
          const manager = dataSource.manager;
          // Buscar usuário pelo ID usando abordagem compatível com MongoDB
          let user = await manager.findOne(User, { where: { id: modifiedBy.userId } as any });
          if (!user) {
            const userRepo = dataSource.getRepository(User);
            user = await userRepo.findOne({ where: { id: modifiedBy.userId } });
          }
          if (!user) {
            const allUsers = await manager.find(User);
            user = (allUsers as any[]).find((u: any) => String(u.id) === String(modifiedBy.userId)) as any;
          }
          if (user) {
            modifierName = (user as any).name || (user as any).email || 'Usuário';
          }
        } catch (_) {
          // Ignorar erro e manter fallback
        }
      }

      project.lastModifiedByName = modifierName || 'Usuário';
    }

    return await this.projectRepository.save(project);
  }

  public async remove(id: string): Promise<boolean> {
    const project = await this.findByIdFlexible(id);
    if (!project) return false;

    await this.projectRepository.remove(project);
    return true;
  }

  /**
   * Busca projetos em um intervalo de datas (gravação ou entrega)
   */
  public async findByDateRange(startDate: Date, endDate: Date): Promise<Project[]> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;

    // Buscar todos e filtrar (MongoDB não suporta QueryBuilder complexo)
    const allProjects = await manager.find(Project);
    
    const filtered = allProjects.filter((p: Project) => {
      // Considerar tanto data de gravação quanto prazo de entrega
      const recording = p.recordingDate ? new Date(p.recordingDate) : null;
      const deadline = p.deliveryDeadline ? new Date(p.deliveryDeadline) : null;
      
      const recordingInRange = recording && recording >= startDate && recording <= endDate;
      const deadlineInRange = deadline && deadline >= startDate && deadline <= endDate;
      
      return recordingInRange || deadlineInRange;
    });

    // Carregar relações e sanitizar
    return this.loadRelationsAndSanitize(filtered);
  }

  /**
   * Próximas gravações (recordingDate >= hoje)
   */
  public async findUpcoming(): Promise<Project[]> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allProjects = await manager.find(Project);
    const filtered = allProjects.filter((p: Project) => {
      const recording = p.recordingDate ? new Date(p.recordingDate) : null;
      return recording && recording >= today;
    });

    // Ordenar por data de gravação
    filtered.sort((a: Project, b: Project) => {
      const dateA = a.recordingDate ? new Date(a.recordingDate).getTime() : Infinity;
      const dateB = b.recordingDate ? new Date(b.recordingDate).getTime() : Infinity;
      return dateA - dateB;
    });

    return this.loadRelationsAndSanitize(filtered);
  }

  /**
   * Projetos atrasados (deliveryDeadline < hoje)
   */
  public async findOverdue(): Promise<Project[]> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allProjects = await manager.find(Project);
    const filtered = allProjects.filter((p: Project) => {
      const deadline = p.deliveryDeadline ? new Date(p.deliveryDeadline) : null;
      return deadline && deadline < today;
    });

    // Ordenar por prazo (mais antigo primeiro)
    filtered.sort((a: Project, b: Project) => {
      const dateA = a.deliveryDeadline ? new Date(a.deliveryDeadline).getTime() : 0;
      const dateB = b.deliveryDeadline ? new Date(b.deliveryDeadline).getTime() : 0;
      return dateA - dateB;
    });

    return this.loadRelationsAndSanitize(filtered);
  }

  /**
   * Projetos desta semana (recordingDate entre hoje e domingo)
   */
  public async findThisWeek(): Promise<Project[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    endOfWeek.setDate(today.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.findByDateRange(today, endOfWeek);
  }

  /**
   * Projetos da próxima semana (segunda a domingo seguinte)
   */
  public async findNextWeek(): Promise<Project[]> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    return this.findByDateRange(nextMonday, nextSunday);
  }

  /**
   * Helper para carregar relações e sanitizar lista de projetos
   */
  private async loadRelationsAndSanitize(projects: Project[]): Promise<Project[]> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;

    // Carregar todos os usuários uma vez
    const allUsers = await manager.find(User);
    const usersMap: Map<string, { id: string; name?: string; email: string }> = new Map(
      (allUsers as any[]).map((u: any) => [String(u.id), { id: String(u.id), name: u.name, email: u.email }])
    );
    const emailsMap: Map<string, { id: string; name?: string; email: string }> = new Map(
      (allUsers as any[])
        .filter((u: any) => !!u.email)
        .map((u: any) => [String(u.email).toLowerCase(), { id: String(u.id), name: u.name, email: u.email }])
    );

    for (const project of projects) {
      try {
        // Carregar client
        if (!project.client || !(project.client as any)?.name) {
          const clientId = this.extractClientId(project as any);
          if (clientId) {
            const loadedClient = await this.clientsService.findOne(clientId);
            if (loadedClient) {
              project.client = loadedClient;
              project.clientId = loadedClient.id;
            }
          }
        }

        // Carregar owner
        if (!project.owner) {
          const ownerId = (project as any).ownerId || project.ownerId;
          if (ownerId) {
            const foundOwner = allUsers.find((u: any) => String(u.id) === String(ownerId)) || null;
            if (foundOwner) {
              project.owner = this.sanitizeUser(foundOwner) as any;
            }
          }
        } else {
          project.owner = this.sanitizeUser(project.owner) as any;
        }

        // Normalizar auditoria
        await this.normalizeAuditNames(project, { usersMap, emailsMap, persist: false });
      } catch (e) {
        console.warn('⚠️  Falha ao carregar relações:', (e as any)?.message || e);
      }
    }

    return projects;
  }
}
