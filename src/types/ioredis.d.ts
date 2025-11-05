declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    maxRetriesPerRequest?: number | null;
  }

  export default class Redis {
    constructor(options?: RedisOptions);
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<string>;
    del(key: string): Promise<number>;
  }
}

