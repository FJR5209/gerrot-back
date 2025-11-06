// eslint-disable-next-line @typescript-eslint/no-var-requires
const TypeORM = require('typeorm');
type Connection = typeof TypeORM.Connection extends new (...args: any[]) => infer R ? R : any;
type ConnectionOptions = any;
const createConnection = TypeORM.createConnection;
import { ConfigModule } from '../config/config.module';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
import { User } from '../../modules/2-users/entities/user.entity';
import { Client } from '../../modules/3-clients/entities/client.entity';
import { Project } from '../../modules/4-projects/entities/project.entity';
import { ScriptVersion } from '../../modules/4-projects/entities/script-version.entity';

let connection: Connection | null = null;

export async function initializeDatabase(): Promise<Connection> {
  if (connection && connection.isConnected) {
    return connection;
  }

  const databaseType = ConfigModule.get<string>('DATABASE_TYPE', 'mongodb');
  
  let options: ConnectionOptions;

  if (databaseType === 'mongodb') {
    // MongoDB - padrão
    const mongoUrl = ConfigModule.get<string>(
      'DATABASE_URL',
      ConfigModule.get<string>('MONGODB_URL', 'mongodb://localhost:27017/gerrot')
    );
    const databaseName = ConfigModule.get<string>('DATABASE_NAME', 'gerrot');

    options = {
      type: 'mongodb',
      // Ajustar URL para incluir opções de pool/timeout via env vars quando não fornecidas
      url: ((): string => {
        try {
          const base = String(mongoUrl || '');
          const params: Record<string, string> = {};
          const maxPool = ConfigModule.get<string>('MONGODB_MAX_POOL_SIZE');
          const minPool = ConfigModule.get<string>('MONGODB_MIN_POOL_SIZE');
          const connectTimeout = ConfigModule.get<string>('MONGODB_CONNECT_TIMEOUT_MS');
          const socketTimeout = ConfigModule.get<string>('MONGODB_SOCKET_TIMEOUT_MS');
          const serverSelectionTimeout = ConfigModule.get<string>('MONGODB_SERVER_SELECTION_TIMEOUT_MS');

          if (maxPool) params.maxPoolSize = String(Number(maxPool));
          if (minPool) params.minPoolSize = String(Number(minPool));
          if (connectTimeout) params.connectTimeoutMS = String(Number(connectTimeout));
          if (socketTimeout) params.socketTimeoutMS = String(Number(socketTimeout));
          if (serverSelectionTimeout) params.serverSelectionTimeoutMS = String(Number(serverSelectionTimeout));

          if (Object.keys(params).length === 0) return base;

          const parts = base.split('?');
          const existing = new URLSearchParams(parts[1] || '');
          Object.entries(params).forEach(([k, v]) => {
            if (!existing.has(k)) existing.append(k, v);
          });
          return parts[0] + (existing.toString() ? `?${existing.toString()}` : '');
        } catch (err) {
          return String(mongoUrl || '');
        }
      })(),
      database: databaseName,
      entities: [User, Client, Project, ScriptVersion],
      // configurações úteis para driver Mongo moderno
      useNewUrlParser: true,
      useUnifiedTopology: true,
      synchronize: ConfigModule.get<string>('NODE_ENV', 'development') === 'development',
      logging: ConfigModule.get<string>('NODE_ENV', 'development') === 'development',
    };
  } else if (databaseType === 'postgres') {
    // PostgreSQL como alternativa
    options = {
      type: 'postgres',
      host: ConfigModule.get<string>('DATABASE_HOST', 'localhost'),
      port: Number(ConfigModule.get<string>('DATABASE_PORT', '5432')),
      username: ConfigModule.get<string>('DATABASE_USER', 'postgres'),
      password: ConfigModule.get<string>('DATABASE_PASSWORD', 'postgres'),
      database: ConfigModule.get<string>('DATABASE_NAME', 'gerrot'),
      entities: [User, Client, Project, ScriptVersion],
      synchronize: ConfigModule.get<string>('NODE_ENV', 'development') === 'development',
      logging: ConfigModule.get<string>('NODE_ENV', 'development') === 'development',
    };
  } else {
    throw new Error(`Tipo de banco de dados não suportado: ${databaseType}. Use 'mongodb' ou 'postgres'.`);
  }

  connection = await createConnection(options);

  try {
    if (databaseType === 'mongodb') {
      const mongoUrl = ConfigModule.get<string>(
        'DATABASE_URL',
        ConfigModule.get<string>('MONGODB_URL', 'mongodb://localhost:27017/gerrot')
      ) as string;
      let hostInfo = '';
      try {
        const urlObj = new URL(mongoUrl);
        hostInfo = `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        hostInfo = mongoUrl.split('@').pop()?.split('/')[0] || 'mongodb';
      }
      const dbName = ConfigModule.get<string>('DATABASE_NAME', 'gerrot');
      console.warn(`✅ DB conectado: mongodb -> ${hostInfo}/${dbName}`);
    } else if (databaseType === 'postgres') {
      const host = ConfigModule.get<string>('DATABASE_HOST', 'localhost');
      const port = Number(ConfigModule.get<string>('DATABASE_PORT', '5432'));
      const dbName = ConfigModule.get<string>('DATABASE_NAME', 'gerrot');
      console.warn(`✅ DB conectado: postgres -> ${host}:${port}/${dbName}`);
    }
  } catch {
    console.warn(`✅ Banco de dados ${databaseType} conectado`);
  }
  
  return connection;
}

export function getDataSource(): Connection {
  if (!connection || !connection.isConnected) {
    throw new Error('Database não inicializada. Chame initializeDatabase() primeiro.');
  }
  return connection;
}

export async function closeDatabase(): Promise<void> {
  if (connection && connection.isConnected) {
    await connection.close();
    connection = null;
    console.log('📦 Conexão com banco de dados fechada');
  }
}
