// src/i18n.js - Translation helper and Google Translate bridge
import en from './en.json';

export { en };
export const translations = { en };

export function t(key, params = {}) {
  let str = en[key] ?? key;
  if (typeof str !== 'string') return String(str);
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function initGoogleTranslateCookie(lang) {
  if (typeof document !== 'undefined') setCookie('googtrans', `/en/${lang === 'kn' ? 'kn' : 'en'}`);
}

export function changeGoogleTranslateLang(targetLang) {
  if (typeof window === 'undefined') return;
  const target = targetLang === 'kn' ? 'kn' : 'en';
  setCookie('googtrans', `/en/${target}`);
  const combo = document.querySelector('.goog-te-combo') || document.querySelector('#google_translate_element select');
  if (combo) {
    combo.value = target;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function setCookie(name, value) {
  const host = window.location.hostname;
  document.cookie = `${name}=${value}; path=/;`;
  if (host) document.cookie = `${name}=${value}; path=/; domain=${host};`;
}
