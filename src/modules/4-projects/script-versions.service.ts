import { ScriptVersion } from './entities/script-version.entity';
import { Project } from './entities/project.entity';
import { getDataSource } from '../../common/database';
type Repository<T> = any;

export class ScriptVersionsService {
  private versionRepository: Repository<ScriptVersion>;
  private projectRepository: Repository<Project>;

  constructor() {
    this.versionRepository = getDataSource().getRepository(ScriptVersion);
    this.projectRepository = getDataSource().getRepository(Project);
  }

  /**
   * Cria uma nova versão de roteiro para um projeto
   */
  public async create(projectId: string, content: string): Promise<ScriptVersion> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    // Buscar projeto (usando workaround para MongoDB)
    let project = await manager.findOne(Project, {
      where: { id: projectId } as any,
      relations: ['versions'],
    });
    
    if (!project) {
      const allProjects = await manager.find(Project);
      project = allProjects.find((p: Project) => String(p.id) === String(projectId)) || null;
    }
    
    if (!project) {
      throw new Error('Projeto não encontrado');
    }

    // Calcular número da versão (próxima versão disponível)
    const existingVersions = project.versions || [];
    const nextVersionNumber = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v: ScriptVersion) => v.versionNumber)) + 1
      : 1;

  // Criar nova versão
    const version = new ScriptVersion();
  // Em MongoDB, garantimos a referência direta por projectId
  version.projectId = String(project.id);
  // Mantemos o campo relacional para compatibilidade, embora possa não ser populado no Mongo
  version.project = project as any;
    version.versionNumber = nextVersionNumber;
    version.content = content.trim();
    version.generatedPdfUrl = null;

    // Salvar versão usando manager (para MongoDB)
    const savedVersion = await manager.save(ScriptVersion, version);
    
    console.log(`✅ Versão ${nextVersionNumber} criada para projeto ${projectId}`);
    console.log(`   Versão ID: ${savedVersion.id}`);
    console.log(`   Conteúdo (primeiros 100 chars): ${savedVersion.content.substring(0, 100)}...`);
    
    return savedVersion;
  }

  /**
   * Busca todas as versões de um projeto
   */
  public async findByProject(projectId: string): Promise<ScriptVersion[]> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
      console.log('🔍 FIND BY PROJECT - Iniciando busca');
      console.log('   Project ID:', projectId);
    
    // Buscar versões priorizando o campo direto projectId (mais estável em Mongo)
    let versions = await manager.find(ScriptVersion, {
      where: { projectId: String(projectId) } as any,
      order: { versionNumber: 'DESC' },
    });
    
      console.log(`   Versões encontradas com query: ${versions.length}`);
    
    // Se não encontrou, tentar listar todas e filtrar (workaround para MongoDB)
    if (!versions || versions.length === 0) {
        console.log('⚠️  Nenhuma versão encontrada com query. Listando todas...');
      
      const allVersions = await manager.find(ScriptVersion);
        console.log(`   Total de versões no banco: ${allVersions.length}`);
      
        // Log detalhado de cada versão
      allVersions.forEach((v: ScriptVersion, idx: number) => {
          const vProject = (v as any).project;
          const vProjectId = (v as any).projectId || vProject?.id || vProject?._id || vProject;
          console.log(`   ${idx + 1}. Versão ID: ${v.id}, Project: ${JSON.stringify(vProject)}, projectId: ${(v as any).projectId}, ProjectId extraído: ${vProjectId}`);
        });
      
      const projectVersions = allVersions.filter((v: ScriptVersion) => {
          const vProject = (v as any).project;
          const vProjectId = String((v as any).projectId || vProject?.id || vProject?._id || vProject || '');
          const match = vProjectId === String(projectId);
        
          if (!match) {
            console.log(`   ❌ Versão ${v.id} não corresponde (${vProjectId} !== ${projectId})`);
          } else {
            console.log(`   ✅ Versão ${v.id} CORRESPONDE!`);
          }
        
          return match;
      });
      
        console.log(`   Versões filtradas manualmente: ${projectVersions.length}`);
      return projectVersions.sort((a: ScriptVersion, b: ScriptVersion) => b.versionNumber - a.versionNumber);
    }
    
    return versions;
  }

  /**
   * Busca uma versão específica por ID
   */
  public async findOne(id: string): Promise<ScriptVersion | null> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    console.log('🔍 Buscando versão com ID:', id);
    
    // Tentar com manager primeiro
    let version = await manager.findOne(ScriptVersion, {
      where: { id } as any,
      relations: ['project'],
    });
    
    if (version) {
      console.log('✅ Versão encontrada com manager.findOne');
      return version;
    }
    
    // Se não encontrou, listar todas e filtrar (workaround para MongoDB)
    console.log('⚠️  Tentando listar todas as versões e filtrar...');
    const allVersions = await manager.find(ScriptVersion);
    console.log(`📋 Total de versões encontradas: ${allVersions.length}`);
    
    version = allVersions.find((v: ScriptVersion) => {
      const vId = String(v.id);
      const searchId = String(id);
      const match = vId === searchId;
      if (!match && allVersions.length < 10) {
        console.log(`  Comparando: "${vId}" !== "${searchId}"`);
      }
      return match;
    }) || null;
    
    if (version) {
      console.log('✅ Versão encontrada listando todas');
      return version;
    }
    
    console.log('❌ Versão não encontrada. IDs disponíveis:', allVersions.map((v: ScriptVersion) => v.id));
    return null;
  }

  /**
   * Atualiza o conteúdo de uma versão
   */
  public async update(id: string, content: string): Promise<ScriptVersion | null> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    console.log('🔄 SERVICE UPDATE - Iniciando atualização');
    console.log('   ID da versão:', id);
    console.log('   Tamanho do conteúdo:', content.length);
    
    // Buscar versão
    let version = await manager.findOne(ScriptVersion, {
      where: { id } as any,
    });
    
    if (!version) {
      console.log('⚠️  Versão não encontrada com findOne, tentando listar todas...');
      const allVersions = await manager.find(ScriptVersion);
      console.log(`   Total de versões encontradas: ${allVersions.length}`);
      version = allVersions.find((v: ScriptVersion) => String(v.id) === String(id)) || null;
      
      if (version) {
        console.log('✅ Versão encontrada na lista completa');
      }
    } else {
      console.log('✅ Versão encontrada com findOne');
    }
    
    if (!version) {
      console.error('❌ Versão não encontrada para atualização');
      return null;
    }

    console.log('📝 Atualizando conteúdo...');
    console.log('   Conteúdo antigo (primeiros 100 chars):', version.content.substring(0, 100));
    console.log('   Conteúdo novo (primeiros 100 chars):', content.substring(0, 100));
    
    version.content = content.trim();
    
    const savedVersion = await manager.save(ScriptVersion, version);
    
    console.log('✅ Versão salva com sucesso no banco');
    console.log('   ID salvo:', savedVersion.id);
    console.log('   Tamanho do conteúdo salvo:', savedVersion.content.length);
    
    return savedVersion;
  }

  /**
   * Atualiza a URL do PDF gerado
   */
  public async updatePdfUrl(id: string, pdfUrl: string): Promise<ScriptVersion | null> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    let version = await manager.findOne(ScriptVersion, {
      where: { id } as any,
    });
    
    if (!version) {
      const allVersions = await manager.find(ScriptVersion);
      version = allVersions.find((v: ScriptVersion) => String(v.id) === String(id)) || null;
    }
    
    if (!version) {
      return null;
    }

    version.generatedPdfUrl = pdfUrl;
    return await manager.save(ScriptVersion, version);
  }

  /**
   * Remove uma versão
   */
  public async remove(id: string): Promise<boolean> {
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    let version = await manager.findOne(ScriptVersion, {
      where: { id } as any,
    });
    
    if (!version) {
      const allVersions = await manager.find(ScriptVersion);
      version = allVersions.find((v: ScriptVersion) => String(v.id) === String(id)) || null;
    }
    
    if (!version) {
      return false;
    }

    await manager.remove(ScriptVersion, version);
    return true;
  }
}

