import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from './axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get('/api/auth/me/');
        setUser(res.data);
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    const handleForcedLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleForcedLogout);
    checkAuth();
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const res = await axiosInstance.post('/api/auth/login/', { email, password });
    setUser(res.data);
    setIsAuthenticated(true);
    navigate('/dashboard');
    return res.data;
  }, [navigate]);

  // Inscription — ne connecte pas l'utilisateur, il doit vérifier son email d'abord
  const signup = useCallback(async (formData) => {
    const res = await axiosInstance.post('/api/auth/register/', formData);
    return res.data;
  }, []);

  // Appelé après vérification email réussie pour mettre à jour le contexte
  const onVerified = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    navigate('/dashboard');
  }, [navigate]);

  // Permet à Profile.jsx de mettre à jour les infos affichées
  const updateUser = useCallback((userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/api/auth/logout/');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      navigate('/');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout, onVerified, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
