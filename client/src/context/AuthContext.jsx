import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('ielts_user') || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  // 启动时校验 token 有效性（refresh）
  useEffect(() => {
    if (localStorage.getItem('ielts_token')) {
      setLoading(true);
      api.getMe()
        .then(({ user }) => {
          setUser(user);
          localStorage.setItem('ielts_user', JSON.stringify(user));
        })
        .catch(() => {
          localStorage.removeItem('ielts_token');
          localStorage.removeItem('ielts_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, user } = await api.login({ username, password });
    localStorage.setItem('ielts_token', token);
    localStorage.setItem('ielts_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (username, password) => {
    const { token, user } = await api.register({ username, password });
    localStorage.setItem('ielts_token', token);
    localStorage.setItem('ielts_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('ielts_token');
    localStorage.removeItem('ielts_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
