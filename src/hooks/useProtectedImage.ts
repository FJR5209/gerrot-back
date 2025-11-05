import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContextObject';

/**
 * Resolve uma URL de imagem que pode exigir Authorization (ex: /users/:id/logo)
 * - Para caminhos começando com '/users/': busca como blob com Authorization e cria um Object URL
 * - Para '/uploads/...': concatena com baseURL pública
 * - Para null/undefined: retorna undefined
 * Revoga o Object URL anterior ao mudar a origem ou desmontar.
 */
export function useProtectedImage(
  path?: string | null,
  options?: { cacheBust?: number | string }
) {
  // Preferir a baseURL do axios (que já considera '/api' em dev),
  // caindo para VITE_API_URL quando disponível.
  const configuredBaseUrl = (api.defaults?.baseURL as string | undefined) ?? undefined;
  const envBaseUrl = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || undefined;
  const baseURL: string = configuredBaseUrl || envBaseUrl || '';
  const { logout } = useAuth();
  const [src, setSrc] = useState<string | undefined>(undefined);
  const objectUrlRef = useRef<string | null>(null);

  const appendCacheBust = useCallback((url: string): string => {
    const bust = options?.cacheBust;
    if (bust === undefined || bust === null || bust === '') return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${encodeURIComponent(String(bust))}`;
  }, [options?.cacheBust]);

  useEffect(() => {
    let cancelled = false;

    const revokeObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    async function resolve() {
      revokeObjectUrl();

      if (!path) {
        setSrc(undefined);
        return;
      }

      try {
        if (path.startsWith('/users/')) {
          // Protegido: buscar blob com Authorization
          const res = await api.get(path, { responseType: 'blob' });
          if (cancelled) return;
          const url = URL.createObjectURL(res.data);
          objectUrlRef.current = url;
          setSrc(url);
        } else if (path.startsWith('/uploads/')) {
          // Público
          const full = `${baseURL}${path}`;
          setSrc(appendCacheBust(full));
        } else if (/^https?:\/\//i.test(path)) {
          // URL absoluta
          setSrc(path);
        } else {
          // Desconhecido
          setSrc(undefined);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401) {
            // Sessão inválida
            logout();
          }
          setSrc(undefined);
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
      revokeObjectUrl();
    };
  }, [path, logout, baseURL, options?.cacheBust, appendCacheBust]);

  return { src } as const;
}
