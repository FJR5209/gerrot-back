import { Client } from './entities/client.entity';
import { getDataSource } from '../../common/database';
type Repository<T> = any;

export class ClientsService {
  private clientRepository: Repository<Client>;

  constructor() {
    this.clientRepository = getDataSource().getRepository(Client);
  }

  private async findByIdFlexible(id: string): Promise<Client | null> {
    // Estratégia robusta para MongoDB: listar e comparar por string
    const all = await this.clientRepository.find();
    const target = all.find((c: Client) => String(c.id) === String(id));
    if (target) return target;

    // Fallbacks adicionais via manager/repository
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    let found = await manager.findOne(Client, { where: { id } as any });
    if (found) return found;
    found = await manager.findOneBy(Client, { id } as any);
    if (found) return found;
    found = await this.clientRepository.findOne({ where: { id } });
    return found ?? null;
  }

  public async create(data: { name: string }): Promise<Client> {
    // Usar manager.save para MongoDB (como no auth.controller)
    const dataSource = getDataSource();
    const manager = dataSource.manager;
    
    const client = new Client();
    client.name = data.name.trim();
    client.logoUrl = null;
    
    const savedClient = await manager.save(Client, client);
    console.log('✅ Cliente criado com ID:', savedClient.id);
    return savedClient;
  }

  public async findAll(): Promise<Client[]> {
    const clients = await this.clientRepository.find({
      order: { name: 'ASC' },
    });
    console.log('📋 Total de clientes encontrados:', clients.length);
    clients.forEach((c: Client) => {
      console.log('  - Cliente ID:', c.id, 'Nome:', c.name);
    });
    return clients;
  }

  public async findOne(id: string): Promise<Client | null> {
    console.log('🔍 Buscando cliente com ID:', id);
    
    // WORKAROUND: Para MongoDB, listar todos e filtrar funciona melhor
    // O problema pode ser com ObjectId do MongoDB no TypeORM
    try {
      const allClients = await this.findAll();
      const client = allClients.find((c: Client) => {
        // Comparar como string para garantir que funciona
        const clientIdStr = String(c.id);
        const searchIdStr = String(id);
        const match = clientIdStr === searchIdStr;
        if (!match) {
          console.log(`  ⚠️  Comparando: "${clientIdStr}" !== "${searchIdStr}"`);
        }
        return match;
      });
      
      if (client) {
        console.log('✅ Cliente encontrado listando todos');
        return client;
      }
      
      // Tentar métodos diretos como fallback
      const dataSource = getDataSource();
      const manager = dataSource.manager;
      
      // Tentativa: manager.findOne
      let foundClient = await manager.findOne(Client, {
        where: { id } as any,
      });
      
      if (foundClient) {
        console.log('✅ Cliente encontrado com manager.findOne');
        return foundClient;
      }
      
      // Tentativa: manager.findOneBy
      foundClient = await manager.findOneBy(Client, { id } as any);
      
      if (foundClient) {
        console.log('✅ Cliente encontrado com manager.findOneBy');
        return foundClient;
      }
      
      // Tentativa: repository.findOne
      foundClient = await this.clientRepository.findOne({
        where: { id },
      });
      
      if (foundClient) {
        console.log('✅ Cliente encontrado com repository.findOne');
        return foundClient;
      }
      
      console.log('❌ Cliente não encontrado. IDs disponíveis:', allClients.map((c: Client) => c.id));
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao buscar cliente:', error?.message || error);
      return null;
    }
  }

  public async update(id: string, data: Partial<Pick<Client, 'name'>>): Promise<Client | null> {
    const client = await this.findByIdFlexible(id);
    if (!client) return null;

    if (data.name !== undefined) {
      client.name = data.name.trim();
    }

    return await this.clientRepository.save(client);
  }

  public async updateLogo(id: string, logoUrl: string): Promise<Client | null> {
    const client = await this.findByIdFlexible(id);
    if (!client) return null;

    client.logoUrl = logoUrl;
    return await this.clientRepository.save(client);
  }

  public async remove(id: string): Promise<boolean> {
    // Regra de negócio: impedir exclusão se vinculado a projetos existentes
    const client = await this.findByIdFlexible(id);

    if (!client) return false;

    if (client.projects && client.projects.length > 0) {
      throw new Error('Não é possível excluir cliente com projetos associados');
    }

    await this.clientRepository.remove(client);
    return true;
  }
}
