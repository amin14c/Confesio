import React, { useState, useEffect, createContext, useContext } from 'react';

interface UserStats {
  anonymousId: string;
  createdAt: number;
  credits: number;
  role_stats: {
    confessions: number;
    guardian_sessions: number;
    avg_rating: number;
    completed_sessions: number;
  };
  preferences: {
    lang: string;
    session_duration: number;
    silent_mode: boolean;
    weight_preference: string;
  };
  badges: string[];
}

interface AuthContextType {
  token: string | null;
  user: UserStats | null;
  login: (token: string, user: UserStats) => void;
  logout: () => void;
  updateUser: (user: UserStats) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('confesio_token'));
  const [user, setUser] = useState<UserStats | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('confesio_token', token);
      fetch('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          logout();
        } else {
          setUser(data);
        }
      })
      .catch(() => logout());
    } else {
      localStorage.removeItem('confesio_token');
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserStats) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: UserStats) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
