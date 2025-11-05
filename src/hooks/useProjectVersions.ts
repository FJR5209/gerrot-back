import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import type { ScriptVersion } from '../types/version';
import { versionCache } from '../types/version';

interface UseProjectVersionsResult {
  versions: ScriptVersion[];
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  refetch: () => Promise<void>;
  createVersion: (content: string) => Promise<void>;
  updateVersion: (id: string, content: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
}

interface BackendVersionRaw {
  id?: string;
  _id?: string;
  versionNumber?: number;
  version?: number;
  content?: string;
  body?: string;
  script?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook para gestão completa de versões de roteiro com cache localStorage
 * 
 * Funcionalidades:
 * - Carregamento inicial do cache (renderização imediata)
 * - Fetch do backend com atualização automática do cache
 * - CRUD completo de versões (create, update, delete)
 * - Controle de race conditions via AbortController
 * - Persistência automática no localStorage
 * 
 * @param projectId - ID do projeto atual
 * @param token - Token de autenticação
 */
export function useProjectVersions(projectId: string, token: string | null): UseProjectVersionsResult {
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  // Ref para controlar AbortController e evitar race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentProjectIdRef = useRef<string>(projectId);

  /**
   * Normaliza versão do backend para o formato ScriptVersion
   */
  const normalizeVersion = useCallback((raw: BackendVersionRaw): ScriptVersion => {
    return {
      id: (raw.id || raw._id || '').toString(),
      versionNumber: raw.versionNumber ?? raw.version ?? 1,
      content: raw.content ?? raw.body ?? raw.script ?? '',
      createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
    };
  }, []);

  /**
   * Carrega versões do localStorage (imediato)
   */
  const loadFromCache = useCallback(() => {
    const cached = versionCache.get(projectId);
    if (cached && cached.length > 0) {
      setVersions(cached);
      setIsFromCache(true);
      console.log(`[useProjectVersions] Carregado ${cached.length} versões do cache para projeto ${projectId}`);
    }
  }, [projectId]);

  /**
   * Busca versões do servidor e atualiza cache
   */
  const fetchFromServer = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setError('Token de autenticação não encontrado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/projects/${projectId}/versions`, {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Verificar se o request foi abortado
      if (signal?.aborted) {
        console.log('[useProjectVersions] Request abortado (navegação/mudança de projeto)');
        return;
      }

      // Normalizar diferentes formatos de resposta do backend
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.items || response.data?.data || response.data?.versions || [];

      const normalized: ScriptVersion[] = raw.map(normalizeVersion);

      // Ordenar por versionNumber decrescente (mais recente primeiro)
      normalized.sort((a, b) => b.versionNumber - a.versionNumber);

      // Atualizar estado e cache
      setVersions(normalized);
      versionCache.set(projectId, normalized);
      setIsFromCache(false);

      console.log(`[useProjectVersions] Carregado ${normalized.length} versões do servidor para projeto ${projectId}`);
    } catch (err: unknown) {
      // Ignorar erros de abort
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) {
        console.log('[useProjectVersions] Request cancelado');
        return;
      }

      console.error('[useProjectVersions] Erro ao buscar versões:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao carregar versões';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [projectId, token, normalizeVersion]);

  /**
   * Recarrega versões do servidor (útil para botão "Recarregar")
   */
  const refetch = useCallback(async () => {
    // Cancelar request anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    await fetchFromServer(controller.signal);
  }, [fetchFromServer]);

  /**
   * Cria uma nova versão
   */
  const createVersion = useCallback(async (content: string) => {
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      setError(null);
      
      await api.post(
        `/projects/${projectId}/versions`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Recarregar versões após criar
      await refetch();
    } catch (err: unknown) {
      console.error('[useProjectVersions] Erro ao criar versão:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao criar versão';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [projectId, token, refetch]);

  /**
   * Atualiza uma versão existente
   */
  const updateVersion = useCallback(async (id: string, content: string) => {
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      setError(null);
      
      await api.patch(
        `/projects/${projectId}/versions/${id}`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Recarregar versões após atualizar
      await refetch();
    } catch (err: unknown) {
      console.error('[useProjectVersions] Erro ao atualizar versão:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao atualizar versão';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [projectId, token, refetch]);

  /**
   * Deleta uma versão
   */
  const deleteVersion = useCallback(async (id: string) => {
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      setError(null);
      
      await api.delete(`/projects/${projectId}/versions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Recarregar versões após deletar
      await refetch();
    } catch (err: unknown) {
      console.error('[useProjectVersions] Erro ao deletar versão:', err);
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao deletar versão';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [projectId, token, refetch]);

  /**
   * Effect principal: carrega cache + servidor quando projectId ou token mudam
   */
  useEffect(() => {
    // Detectar mudança de projeto
    if (currentProjectIdRef.current !== projectId) {
      console.log(`[useProjectVersions] Projeto mudou de ${currentProjectIdRef.current} para ${projectId}`);
      currentProjectIdRef.current = projectId;
      
      // Cancelar request anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Resetar estado
      setVersions([]);
      setIsFromCache(false);
      setError(null);
    }

    // Carregar do cache primeiro (imediato)
    loadFromCache();

    // Depois buscar do servidor
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchFromServer(controller.signal);

    // Cleanup: abortar request ao desmontar ou mudar projectId
    return () => {
      controller.abort();
    };
  }, [projectId, token, loadFromCache, fetchFromServer]);

  return {
    versions,
    loading,
    error,
    isFromCache,
    refetch,
    createVersion,
    updateVersion,
    deleteVersion,
  };
}
