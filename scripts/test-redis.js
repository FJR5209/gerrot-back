#!/usr/bin/env node
/*
  Teste simples de conexão Redis usando ioredis.
  Uso:
    REDIS_URL="rediss://:PASSWORD@host:6380" node scripts/test-redis.js
  Ou, carregando .env antes:
    export $(cat .env | xargs) && node scripts/test-redis.js

  O script faz PING e imprime apenas o resultado (PONG) ou uma mensagem de erro.
*/

const Redis = require('ioredis');

const url = process.env.REDIS_URL || null;
const host = process.env.REDIS_HOST || null;
const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : null;
const password = process.env.REDIS_PASSWORD || undefined;
const tls = (process.env.REDIS_TLS || 'false').toLowerCase() === 'true';

function createClient() {
  if (url) {
    return new Redis(url, { lazyConnect: true });
  }

  const opts = {
    host: host || '127.0.0.1',
    port: port || 6379,
    password: password || undefined,
    lazyConnect: true,
  };
  if (tls) opts.tls = {};
  return new Redis(opts);
}

(async () => {
  const client = createClient();
  try {
    await client.connect();
    const res = await client.ping();
    console.log('PING =>', res);
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('ERRO ao conectar/pingar Redis:', err.message || err);
    try { client.disconnect(); } catch(e){}
    process.exit(2);
  }
})();
