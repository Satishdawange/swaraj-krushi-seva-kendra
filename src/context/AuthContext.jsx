import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import {
  clearDashboardMetricsCache,
  getGoogleSheetsConfig,
  loginWithGoogleSheets,
  changeGoogleSheetsPassword,
  logoutGoogleSheetsSession,
  validateGoogleSheetsSession
} from '../service/googleSheetsService';

const AuthContext = createContext(null);
const STORAGE_KEY_AUTH = 'sksk_current_auth_user';
const STORAGE_KEY_TOKEN = 'sksk_auth_session_token';
const SESSION_CHECK_INTERVAL = 2 * 60 * 1000;

function clearSavedSession() {
  localStorage.removeItem(STORAGE_KEY_AUTH);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

function saveSession(user, token = '') {
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);
  else localStorage.removeItem(STORAGE_KEY_TOKEN);
}

function clearDashboardCacheForUser(userId) {
  if (userId) clearDashboardMetricsCache(userId);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const savedUserText = localStorage.getItem(STORAGE_KEY_AUTH);
        if (!savedUserText) {
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          return;
        }

        const savedUser = JSON.parse(savedUserText);
        if (savedUser?.authProvider === 'googleSheets') {
          const token = localStorage.getItem(STORAGE_KEY_TOKEN);
          if (!token) {
            clearSavedSession();
            return;
          }
          const result = await validateGoogleSheetsSession(token);
          if (!active) return;
          if (!result.valid || !result.user) {
            clearDashboardCacheForUser(savedUser.id);
            clearSavedSession();
            return;
          }
          const restoredUser = { ...result.user, authProvider: 'googleSheets' };
          saveSession(restoredUser, token);
          setUser(restoredUser);
          return;
        }

        if (savedUser?.authProvider === 'supabase' && supabase) {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!active) return;
          if (data?.user?.id === savedUser.id) {
            setUser(savedUser);
            return;
          }
        }
        clearSavedSession();
      } catch (error) {
        if (active) {
          try {
            clearDashboardCacheForUser(JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{}').id);
          } catch (storageError) {
            console.warn('Dashboard cache cleanup failed:', storageError);
          }
          clearSavedSession();
          setAuthError(`सत्राची पडताळणी करता आली नाही. कृपया पुन्हा लॉग इन करा. (${error.message})`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (user?.authProvider !== 'googleSheets') return undefined;
    let checking = false;

    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        const result = await validateGoogleSheetsSession(token);
        if (!result.valid || !result.user) {
          clearDashboardCacheForUser(user.id);
          clearSavedSession();
          setUser(null);
          setAuthError('तुमचे सत्र कालबाह्य झाले किंवा पासवर्ड बदलला आहे. कृपया पुन्हा लॉग इन करा.');
          return;
        }
        const validatedUser = { ...result.user, authProvider: 'googleSheets' };
        setAuthError('');
        if (validatedUser.id !== user.id || validatedUser.role !== user.role) {
          saveSession(validatedUser, token);
          setUser(validatedUser);
        }
      } catch (error) {
        setAuthError(`सत्राची पडताळणी सध्या करता आली नाही. इंटरनेट तपासा. (${error.message})`);
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(checkSession, SESSION_CHECK_INTERVAL);
    window.addEventListener('focus', checkSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkSession);
    };
  }, [user]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === null ||
          (event.key === STORAGE_KEY_AUTH && !event.newValue) ||
          (event.key === STORAGE_KEY_TOKEN && !event.newValue)) {
        try {
          const storedUser = event.key === STORAGE_KEY_AUTH
            ? JSON.parse(event.oldValue || '{}')
            : JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH) || '{}');
          clearDashboardCacheForUser(storedUser.id);
        } catch (error) {
          console.warn('Dashboard cache cleanup failed:', error);
        }
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const signIn = async (identifier, password) => {
    const id = String(identifier || '').trim().toLowerCase();
    const pwd = String(password || '').trim();
    setAuthError('');

    if (getGoogleSheetsConfig().webAppUrl) {
      try {
        const result = await loginWithGoogleSheets(id, pwd);
        const authenticatedUser = { ...result.user, authProvider: 'googleSheets' };
        saveSession(authenticatedUser, result.token);
        setUser(authenticatedUser);
        return authenticatedUser;
      } catch (error) {
        if (!id.includes('@')) throw error;
      }
    }

    if (id.includes('@') && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: id, password: pwd });
      if (!error && data?.user) {
        const authenticatedUser = {
          id: data.user.id,
          username: data.user.email,
          role: 'admin',
          fullName: 'व्यवस्थापक (Supabase)',
          mobile: '',
          authProvider: 'supabase'
        };
        saveSession(authenticatedUser);
        setUser(authenticatedUser);
        return authenticatedUser;
      }
      if (error) throw error;
    }

    throw new Error('चुकीचा आयडी किंवा पासवर्ड! कृपया पुन्हा तपासा.');
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!user) throw new Error('पासवर्ड बदलण्यासाठी लॉग इन करा.');
    if (!currentPassword || !newPassword) throw new Error('सध्याचा आणि नवीन पासवर्ड भरा.');
    if (newPassword.length < 8) throw new Error('नवीन पासवर्ड किमान ८ अक्षरांचा असावा.');

    if (user.authProvider === 'googleSheets') {
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      await changeGoogleSheetsPassword(token, currentPassword, newPassword);
      const renewed = await loginWithGoogleSheets(user.username, newPassword);
      const authenticatedUser = { ...renewed.user, authProvider: 'googleSheets' };
      saveSession(authenticatedUser, renewed.token);
      setUser(authenticatedUser);
      return authenticatedUser;
    }

    if (user.authProvider === 'supabase' && supabase) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.username,
        password: currentPassword,
      });
      if (verifyError) throw new Error('सध्याचा पासवर्ड चुकीचा आहे.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return user;
    }

    throw new Error('या खात्यासाठी पासवर्ड बदल उपलब्ध नाही.');
  };

  const signOut = async () => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const provider = user?.authProvider;
    if (user?.id) clearDashboardMetricsCache(user.id);
    setUser(null);
    clearSavedSession();
    setAuthError('');

    try {
      if (provider === 'googleSheets' && token) await logoutGoogleSheetsSession(token);
      if (provider === 'supabase' && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    } catch (error) {
      const message = `या डिव्हाइसवरून बाहेर पडलात; सर्व्हर सत्र रद्द करता आले नाही. (${error.message})`;
      setAuthError(message);
      return { warning: message };
    }
    return { warning: '' };
  };

  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isCustomer = role === 'customer';

  const value = {
    user,
    role,
    isAdmin,
    isStaff,
    isCustomer,
    isAuthenticated: !!user,
    loading,
    authError,
    signIn,
    signOut,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
