import api from './axios';
const DEV = import.meta.env.DEV;

export type ScriptType = 'social_media' | 'internal' | 'tv_commercial';

type BackendProject = {
  _id?: string;
  id?: string;
  projectId?: string;
  title: string;
  scriptType: ScriptType;
  clientId?: string;
  ownerId?: string;
  owner?: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
  // Campos de agenda
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
};

function normalizeProject(p: BackendProject): Project {
  if (DEV) {
    console.log('📦 Projeto raw do backend:', p);
  }
  return {
    // Preferir _id (Mongo) para operações REST; alguns backends enviam também id "amigável"/externo
    id: p._id ?? p.id ?? p.projectId ?? '',
    title: p.title,
    scriptType: p.scriptType,
    clientId: p.clientId,
    ownerId: p.ownerId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    description: p.description,
    // Priorizar campos de auditoria novos, fallback para owner se não existirem
    createdBy: p.createdBy ?? p.owner?.id,
    createdByName: p.createdByName ?? p.owner?.name,
    lastModifiedBy: p.lastModifiedBy,
    lastModifiedByName: p.lastModifiedByName,
    // Campos de agenda
    recordingDate: p.recordingDate,
    deliveryDeadline: p.deliveryDeadline,
    estimatedDuration: p.estimatedDuration,
    location: p.location,
    notes: p.notes,
  };
}

export interface Project {
  id: string;
  title: string;
  scriptType: ScriptType;
  clientId?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
  // Campos de agenda
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}

export interface CreateProjectPayload {
  title: string;
  scriptType: ScriptType;
  clientId: string;
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}

export interface UpdateProjectPayload {
  title?: string;
  scriptType?: ScriptType;
  clientId?: string;
  recordingDate?: string;
  deliveryDeadline?: string;
  estimatedDuration?: number;
  location?: string;
  notes?: string;
}

/**
 * Lista todos os projetos do usuário autenticado
 */
export async function listProjects(): Promise<Project[]> {
  if (DEV) console.log('[API] listProjects chamada');
  const res = await api.get<BackendProject[]>('/projects');
  if (DEV) console.log('[API] listProjects quantidade:', res.data?.length);
  const mapped = res.data.map((p) => {
    const id = p.id ?? p._id ?? p.projectId ?? '';
    if (DEV) console.log('[API] listProjects item IDs:', { id, _id: p._id, id2: p.id, projectId: p.projectId });
    return normalizeProject(p);
  });
  return mapped;
}

/**
 * Busca um projeto específico por ID
 */
export async function getProject(id: string): Promise<Project> {
  if (DEV) console.log('[API] getProject:', id);
  const res = await api.get<BackendProject>(`/projects/${id}`);
  if (DEV) console.log('[API] getProject resposta:', res.data);
  return normalizeProject(res.data);
}

/**
 * Cria um novo projeto
 */
export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  if (DEV) console.log('[API] createProject payload:', payload);
  const res = await api.post<BackendProject>('/projects', payload);
  if (DEV) console.log('[API] createProject resposta:', res.data);
  return normalizeProject(res.data);
}

/**
 * Atualiza um projeto existente
 */
export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
  if (DEV) console.log('[API] updateProject chamado com:', { id, payload });
  try {
    const res = await api.patch<BackendProject>(`/projects/${id}`, payload);
    if (DEV) console.log('[API] updateProject resposta:', res.data);
    return normalizeProject(res.data);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      // 1) Tentar PUT /projects/:id
      try {
        if (DEV) console.warn('[API] updateProject fallback: tentando PUT /projects/:id');
        const resPut = await api.put<BackendProject>(`/projects/${id}`, payload);
        if (DEV) console.log('[API] updateProject PUT resposta:', resPut.data);
        return normalizeProject(resPut.data);
      } catch (err2) {
        const status2 = (err2 as { response?: { status?: number } })?.response?.status;
        // 2) Tentar PATCH /project/:id (singular)
        if (status2 === 404 || status2 === 405) {
          try {
            if (DEV) console.warn('[API] updateProject fallback: tentando PATCH /project/:id');
            const res2 = await api.patch<BackendProject>(`/project/${id}`, payload);
            if (DEV) console.log('[API] updateProject fallback resposta:', res2.data);
            return normalizeProject(res2.data);
          } catch (err3) {
            const status3 = (err3 as { response?: { status?: number } })?.response?.status;
            // 3) Tentar PUT /project/:id (singular)
            if (status3 === 404 || status3 === 405) {
              try {
                if (DEV) console.warn('[API] updateProject fallback: tentando PUT /project/:id');
                const res3 = await api.put<BackendProject>(`/project/${id}`, payload);
                if (DEV) console.log('[API] updateProject PUT singular resposta:', res3.data);
                return normalizeProject(res3.data);
              } catch (err4) {
                const status4 = (err4 as { response?: { status?: number } })?.response?.status;
                // 4) Tentar PATCH /projects?id=:id (query)
                if (status4 === 404 || status4 === 405) {
                  if (DEV) console.warn('[API] updateProject fallback: tentando PATCH /projects?id=:id');
                  const resQ = await api.patch<BackendProject>(`/projects`, payload, { params: { id } });
                  if (DEV) console.log('[API] updateProject PATCH query resposta:', resQ.data);
                  return normalizeProject(resQ.data);
                }
                throw err4;
              }
            }
            throw err3;
          }
        }
        throw err2;
      }
    }
    throw err;
  }
}

/**
 * Remove um projeto
 */
export async function deleteProject(id: string): Promise<void> {
  if (DEV) console.log('[API] deleteProject chamado com ID:', id);
  try {
    await api.delete(`/projects/${id}`);
    if (DEV) console.log('[API] deleteProject sucesso /projects/:id');
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      try {
        if (DEV) console.warn('[API] deleteProject fallback: tentando /project/:id');
        await api.delete(`/project/${id}`);
        if (DEV) console.log('[API] deleteProject sucesso fallback /project/:id');
        return;
      } catch (err2) {
        const status2 = (err2 as { response?: { status?: number } })?.response?.status;
        if (status2 === 404 || status2 === 405) {
          // Tentar DELETE /projects?id=:id
          if (DEV) console.warn('[API] deleteProject fallback: tentando DELETE /projects?id=:id');
          await api.delete(`/projects`, { params: { id } });
          if (DEV) console.log('[API] deleteProject sucesso fallback query /projects?id=:id');
          return;
        }
        throw err2;
      }
    }
    throw err;
  }
}

/**
 * Interface para resposta de agenda
 */
export interface AgendaResponse {
  projects: Project[];
  grouped: Record<string, Project[]>;
  total: number;
}

/**
 * Busca agenda de projetos com filtro
 */
export async function getAgenda(filter?: 'upcoming' | 'overdue' | 'this-week' | 'next-week'): Promise<AgendaResponse> {
  if (DEV) console.log('[API] getAgenda chamada com filtro:', filter);
  const url = filter ? `/projects/agenda?filter=${filter}` : '/projects/agenda';
  const res = await api.get<AgendaResponse>(url);
  if (DEV) console.log('[API] getAgenda resposta:', res.data);
  return res.data;
}

/**
 * Busca calendário de projetos por período
 */
export async function getCalendar(start: string, end: string): Promise<Project[]> {
  if (DEV) console.log('[API] getCalendar chamada:', { start, end });
  const res = await api.get<Project[]>(`/projects/calendar?start=${start}&end=${end}`);
  if (DEV) console.log('[API] getCalendar resposta:', res.data.length, 'projetos');
  return res.data.map(normalizeProject);
}
