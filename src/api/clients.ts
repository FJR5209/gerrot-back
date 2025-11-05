import api from './axios';

type BackendClient = {
  _id?: string;
  id?: string;
  name: string;
  logoUrl?: string;
  createdAt?: string;
};

function normalizeClient(c: BackendClient): Client {
  return {
    id: c.id ?? c._id ?? '',
    name: c.name,
    logoUrl: c.logoUrl,
    createdAt: c.createdAt,
  };
}

export interface Client {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt?: string;
}

export async function listClients(): Promise<Client[]> {
  const res = await api.get<BackendClient[]>('/clients');
  return res.data.map(normalizeClient);
}

export async function getClient(id: string): Promise<Client> {
  const res = await api.get<BackendClient>(`/clients/${id}`);
  return normalizeClient(res.data);
}

export async function createClient(payload: { name: string }): Promise<Client> {
  const res = await api.post<BackendClient>('/clients', payload);
  return normalizeClient(res.data);
}

export async function updateClient(id: string, payload: { name: string }): Promise<Client> {
  const res = await api.patch<BackendClient>(`/clients/${id}`, payload);
  return normalizeClient(res.data);
}

export async function deleteClient(id: string): Promise<void> {
  console.log('[deleteClient] Tentando deletar cliente com ID:', id);
  console.log('[deleteClient] URL será:', `/clients/${id}`);
  await api.delete(`/clients/${id}`);
  console.log('[deleteClient] Cliente deletado com sucesso');
}

/**
 * Faz upload da logo do cliente
 */
export async function uploadClientLogo(clientId: string, file: File): Promise<Client> {
  const formData = new FormData();
  // Backend espera o campo 'file'
  formData.append('file', file);
  // Usar PATCH conforme contrato
  const res = await api.patch<BackendClient>(`/clients/${clientId}/logo`, formData);
  return normalizeClient(res.data);
}

/**
 * Remove a logo do cliente
 */
export async function removeClientLogo(clientId: string): Promise<Client> {
  const res = await api.delete<BackendClient>(`/clients/${clientId}/logo`);
  return normalizeClient(res.data);
}
