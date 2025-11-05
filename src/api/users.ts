import api from './axios';

// Tipos vindos do backend (podem variar entre id e _id)
type BackendUser = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  logoUrl?: string | null;
  createdAt?: string;
};

function normalizeUser(u: BackendUser): User {
  return {
    id: u.id ?? u._id ?? '',
    name: u.name,
    email: u.email,
    logoUrl: u.logoUrl ?? null,
    // alguns backends podem não enviar createdAt; garante string válida
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  logoUrl?: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
}

/**
 * Lista todos os usuários
 */
export async function listUsers(): Promise<User[]> {
  // Tenta múltiplos formatos e rotas para garantir compatibilidade
  const endpoints: Array<string | { url: string; params?: Record<string, unknown> }> = [
    { url: '/users', params: { limit: 1000 } },
    '/users',
    '/user',
    '/users/all',
    '/users/list',
    '/user/list',
    '/user/all',
  ];

  console.log('[listUsers] Tentando carregar usuários...');

  // extrai o array de usuários independentemente do envelope
  const extractArray = (data: unknown): BackendUser[] | null => {
    if (Array.isArray(data)) return data as BackendUser[];
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as BackendUser[];
      if (Array.isArray(obj.users)) return obj.users as BackendUser[];
      if (Array.isArray(obj.items)) return obj.items as BackendUser[];
      if (Array.isArray(obj.results)) return obj.results as BackendUser[];
    }
    return null;
  };

  let lastError: unknown;
  for (const ep of endpoints) {
    try {
      const epString = typeof ep === 'string' ? ep : `${ep.url}?${new URLSearchParams(ep.params as Record<string, string>).toString()}`;
      console.log(`[listUsers] Tentando endpoint: ${epString}`);
      
      const res = typeof ep === 'string' ? await api.get(ep) : await api.get(ep.url, { params: ep.params });
      
      console.log(`[listUsers] Resposta de ${epString}:`, res.data);
      
      const arr = extractArray(res.data);
      if (arr) {
        console.log(`[listUsers] ✅ Sucesso! ${arr.length} usuários encontrados em ${epString}`);
        console.log('[listUsers] Primeiros usuários:', arr.slice(0, 3));
        return arr.map(normalizeUser);
      }
      
      // se a resposta for um único objeto (ex.: rota singular por engano), normaliza como array de 1
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        const values = Object.values(res.data as Record<string, unknown>);
        const maybe = values.length ? extractArray(values[0]) : null;
        if (maybe) {
          console.log(`[listUsers] ✅ Sucesso via envelope! ${maybe.length} usuários encontrados`);
          return maybe.map(normalizeUser);
        }
      }
      
      console.log(`[listUsers] ⚠️ Endpoint ${epString} não retornou array válido`);
    } catch (e) {
      const epString = typeof ep === 'string' ? ep : ep.url;
      console.log(`[listUsers] ❌ Erro em ${epString}:`, e);
      lastError = e;
    }
  }
  console.error('[listUsers] 🔴 Todos os endpoints falharam. Último erro:', lastError);
  throw lastError;
}

/**
 * Busca um usuário por ID
 */
export async function getUser(id: string): Promise<User> {
  const res = await api.get<BackendUser>(`/users/${id}`);
  return normalizeUser(res.data);
}

/**
 * Cria um novo usuário (registro)
 * Usa /auth/register SEM token (regra de ouro do backend)
 */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const res = await api.post<BackendUser>('/auth/register', payload);
  return normalizeUser(res.data);
}

/**
 * Atualiza um usuário
 */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const endpoints = [`/users/${id}`, `/user/${id}`];
  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const res = await api.patch<BackendUser>(url, payload);
      return normalizeUser(res.data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Deleta um usuário
 */
export async function deleteUser(id: string): Promise<void> {
  console.log(`[deleteUser] Iniciando exclusão do usuário com ID: "${id}"`);
  console.log(`[deleteUser] Tipo do ID: ${typeof id}, Vazio?: ${!id}, Valor:`, id);
  
  if (!id || id.trim() === '') {
    throw new Error('ID do usuário é obrigatório para exclusão');
  }
  
  // Tenta múltiplos formatos de endpoints
  const endpoints = [
    `/users/${id}`,
    `/user/${id}`,
    `/users/delete/${id}`,
    `/user/delete/${id}`,
    { url: `/users/${id}/delete`, method: 'post' as const },
    { url: `/users`, params: { id } },
  ];
  
  let lastError: unknown;
  
  for (const ep of endpoints) {
    try {
      if (typeof ep === 'string') {
        const epString = ep;
        console.log(`[deleteUser] Tentando DELETE ${epString}`);
        await api.delete(epString);
        console.log(`[deleteUser] ✅ Sucesso! Usuário deletado via DELETE ${epString}`);
        return;
      } else if ('method' in ep && ep.method === 'post') {
        const epString = ep.url;
        console.log(`[deleteUser] Tentando POST ${epString}`);
        await api.post(epString);
        console.log(`[deleteUser] ✅ Sucesso! Usuário deletado via POST ${epString}`);
        return;
      } else {
        const epString = `${ep.url}?id=${id}`;
        console.log(`[deleteUser] Tentando DELETE ${epString}`);
        await api.delete(ep.url, { params: ep.params });
        console.log(`[deleteUser] ✅ Sucesso! Usuário deletado via DELETE ${epString}`);
        return;
      }
    } catch (e) {
      const epString = typeof ep === 'string' ? ep : ep.url;
      const error = e as { response?: { status?: number; data?: unknown }; message?: string };
      console.log(`[deleteUser] ❌ Erro em ${epString}:`, {
        status: error.response?.status,
        statusText: error.response?.data,
        message: error.message,
        fullError: e,
      });
      lastError = e;
    }
  }
  
  console.error('[deleteUser] 🔴 Todos os endpoints falharam. Último erro:', lastError);
  const error = lastError as { response?: { status?: number; data?: { message?: string } }; message?: string };
  
  // Mensagem de erro mais amigável
  if (error.response?.status === 404) {
    throw new Error(`Usuário não encontrado ou rota de exclusão não disponível. ID: ${id}`);
  } else if (error.response?.status === 403) {
    throw new Error('Você não tem permissão para excluir este usuário');
  } else if (error.response?.status === 401) {
    throw new Error('Não autenticado. Faça login novamente.');
  } else {
    throw new Error(error.response?.data?.message || error.message || 'Erro ao excluir usuário');
  }
}

/**
 * Faz upload da foto do usuário (logo/avatar)
 */
export async function uploadUserLogo(userId: string, file: File): Promise<User> {
  const formData = new FormData();
  formData.append('file', file);
  // Não setar Content-Type manualmente ao usar FormData
  const endpoints = [`/users/${userId}/logo`, `/user/${userId}/logo`];
  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const res = await api.patch<BackendUser>(url, formData);
      return normalizeUser(res.data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Remove a foto do usuário
 */
export async function removeUserLogo(userId: string): Promise<User> {
  const endpoints = [`/users/${userId}/logo`, `/user/${userId}/logo`, `/users/logo/${userId}`];
  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const res = await api.delete<BackendUser>(url);
      return normalizeUser(res.data);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
