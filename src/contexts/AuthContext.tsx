import { useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { AuthContext } from './AuthContextObject';
import type { User } from './auth.types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo ao carregar
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      // Como não temos endpoint /auth/me, apenas marcamos como autenticado
      // O usuário será carregado no próximo login
      // Alternativa: salvar user no localStorage também
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // Se falhar o parse, remove dados corrompidos
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Tentando login com:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Resposta do login:', response.data);
      
      // Backend retorna 'accessToken', não 'token'
      const { accessToken, user: userData } = response.data;
      
      if (!accessToken) {
        throw new Error('Token não retornado pelo servidor');
      }
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      console.log('Login bem-sucedido! Token salvo.');
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error('Credenciais inválidas');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

  // useAuth foi movido para AuthContextObject.ts para evitar avisos do Fast Refresh

