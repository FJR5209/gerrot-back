/**
 * Tipos e utilitários para gestão de versões de roteiros com cache localStorage
 */

export interface ScriptVersion {
  id: string;
  versionNumber: number;
  content: string;
  createdAt: string;
}

/**
 * Utilitários de cache localStorage por projeto
 */
export const versionCache = {
  /**
   * Retorna a chave de cache para um projeto específico
   */
  getKey(projectId: string): string {
    return `versions:${projectId}`;
  },

  /**
   * Carrega versões do cache localStorage
   */
  get(projectId: string): ScriptVersion[] | null {
    try {
      const storageKey = this.getKey(projectId);
      const cached = localStorage.getItem(storageKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      // Validação básica: deve ser array
      if (!Array.isArray(data)) return null;
      
      return data as ScriptVersion[];
    } catch (error) {
      console.error('[versionCache] Erro ao ler cache:', error);
      return null;
    }
  },

  /**
   * Salva versões no cache localStorage
   */
  set(projectId: string, versions: ScriptVersion[]): void {
    try {
      const storageKey = this.getKey(projectId);
      localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (error) {
      console.error('[versionCache] Erro ao salvar cache:', error);
    }
  },

  /**
   * Remove cache de um projeto específico
   */
  remove(projectId: string): void {
    try {
      const storageKey = this.getKey(projectId);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[versionCache] Erro ao remover cache:', error);
    }
  },
};
