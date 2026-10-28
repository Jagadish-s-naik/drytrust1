// src/ctx.jsx - Unified application context (session, language, and toast notifications)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSession, setSession, clearSession, getStoredLang, setStoredLang } from './data.js';
import { t as translate, changeGoogleTranslateLang } from './i18n.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => getStoredLang());
  const [session, setSessionState] = useState(() => getSession());
  const [toast, setToast] = useState(null);

  const setLang = (nl) => { setLangState(nl); setStoredLang(nl); changeGoogleTranslateLang(nl); };
  const t = (k, p = {}) => translate(k, lang, p);
  const loginSeller = (unitId) => { const s = { role: 'seller', unitId }; setSession(s); setSessionState(s); };
  const loginAdmin = () => { const s = { role: 'admin' }; setSession(s); setSessionState(s); };
  const logout = () => { clearSession(); setSessionState(null); };
  const showToast = (message, type = 'info') => setToast({ message, type });
  const hideToast = () => setToast(null);

  useEffect(() => {
    const onToast = (e) => e.detail?.message && showToast(e.detail.message, e.detail.type || 'info');
    window.addEventListener('dt_toast', onToast);
    return () => window.removeEventListener('dt_toast', onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const tId = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(tId);
  }, [toast]);

  return (
    <AppContext.Provider value={{ lang, setLang, t, session, loginSeller, loginAdmin, logout, toast, showToast, hideToast }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
