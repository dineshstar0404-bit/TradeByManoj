import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedUser, token] = await Promise.all([
          AsyncStorage.getItem('mt_user'),
          AsyncStorage.getItem('mt_token'),
        ]);
        if (storedUser && token) setUser(JSON.parse(storedUser));
      } finally { setLoading(false); }
    })();
  }, []);

  const login = async (userId, password) => {
    const data = await apiLogin(userId, password);
    await AsyncStorage.setItem('mt_token', data.token);
    await AsyncStorage.setItem('mt_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['mt_token', 'mt_user']);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
