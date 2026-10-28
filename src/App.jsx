// src/App.jsx - Routes, route guards, Home landing, NotFound, and layout
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Header, Toast, Icon } from './ui.jsx';
import { useApp } from './ctx.jsx';
import Seller from './pages/Seller.jsx';
import NewBatch from './pages/NewBatch.jsx';
import Batch, { Order } from './pages/Batch.jsx';
import Scan from './pages/Scan.jsx';
import Admin from './pages/Admin.jsx';

const Guard = ({ role, to, children }) => (useApp().session?.role === role ? children : <Navigate to={to} replace />);

function Home() {
  const { t, session } = useApp();
  const rows = [
    { to: session?.role === 'seller' ? '/seller/dashboard' : '/seller/auth', border: 'var(--ink)', bg: 'var(--ink)', color: 'var(--paper)', icon: 'raisedRack', title: t('homeSellerRowTitle'), desc: t('homeSellerRowDesc') },
    { to: '/scan', border: 'var(--turmeric)', bg: 'var(--turmeric)', color: 'var(--ink)', icon: 'scan', title: t('homeBuyerRowTitle'), desc: t('homeBuyerRowDesc') },
    { to: session?.role === 'admin' ? '/admin/dashboard' : '/admin/login', border: 'var(--seaweed)', bg: 'var(--seaweed)', color: '#fff', icon: 'stamp', title: t('homeAdminRowTitle'), desc: t('homeAdminRowDesc') }
  ];
  return (
    <div className="container-narrow">
      <div style={{ textAlign: 'center', margin: '1.5rem 0 2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: '#FEF3D6', color: '#8A5D00', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.85rem' }}>
          <Icon name="stamp" size={16} color="#8A5D00" /><span>Coastal Karnataka Trust Label</span>
        </div>
        <h1 style={{ fontSize: '2.1rem', marginBottom: '0.75rem', lineHeight: 1.2 }}>{t('homeHeroTitle')}</h1>
        <p style={{ color: '#445566', fontSize: '1.05rem', lineHeight: 1.5, maxWidth: 460, margin: '0 auto' }}>{t('homeHeroSubtitle')}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {rows.map((r, i) => (
          <Link key={i} to={r.to} className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', borderLeft: `5px solid ${r.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', backgroundColor: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={r.icon} size={24} color={r.color} />
              </div>
              <div><h3 style={{ fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>{r.title}</h3><p style={{ color: '#556677', fontSize: '0.875rem' }}>{r.desc}</p></div>
            </div>
            <span style={{ fontSize: '1.5rem', color: 'var(--ink)', fontWeight: 600 }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const NotFound = () => (
  <div className="container-narrow" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>404</h1>
    <p style={{ color: '#556677', marginBottom: '1.5rem' }}>Page not found.</p>
    <Link to="/" className="btn btn-primary">{useApp().t('goHome')}</Link>
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            {['/seller', '/seller/auth', '/seller/login', '/seller/dashboard'].map((p) => <Route key={p} path={p} element={<Seller />} />)}
            <Route path="/seller/batch/new" element={<Guard role="seller" to="/seller/auth"><NewBatch /></Guard>} />
            <Route path="/b/:batchId/result" element={<Batch />} />
            <Route path="/b/:batchId" element={<Batch />} />
            <Route path="/scan" element={<Scan />} />
            {['/order/summary', '/order/:id'].map((p) => <Route key={p} path={p} element={<Order />} />)}
            {['/admin', '/admin/login'].map((p) => <Route key={p} path={p} element={<Admin />} />)}
            <Route path="/admin/dashboard" element={<Guard role="admin" to="/admin"><Admin /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toast />
      </div>
    </HashRouter>
  );
}