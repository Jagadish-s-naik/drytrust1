// src/main.jsx - Font imports, styles, seed data init, Google Translate patch & render
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/noto-sans-kannada';
import './styles.css';

import { initSeedDataIfEmpty, getStoredLang } from './data.js';
import { initGoogleTranslateCookie } from './i18n.js';
import { AppProvider } from './ctx.jsx';
import App from './App.jsx';

// Protect React DOM from Google Translate font node mutations
if (typeof Node === 'function' && Node.prototype) {
  const origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return origRemoveChild.apply(this, arguments);
  };
  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, refNode) {
    if (refNode && refNode.parentNode !== this) return newNode;
    return origInsertBefore.apply(this, arguments);
  };
}

// Ensure Google Translate boots in saved language preference
initGoogleTranslateCookie(getStoredLang());

// Seed demo data if localStorage is empty
initSeedDataIfEmpty();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
