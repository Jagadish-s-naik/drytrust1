// src/ui.jsx - Shared UI components (Icons, Seal, ScoreBars, BandChip, Toast, Modal, EmptyState, ChecklistToggle, Header, LangToggle, BuyerCheck)
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from './ctx.jsx';
import { bandOf } from './score.js';

const ICON_PATHS = {
  raisedRack: (<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="10" x2="21" y2="10" strokeDasharray="2 2"/><line x1="6" y1="12" x2="4" y2="21"/><line x1="18" y1="12" x2="20" y2="21"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M7 8c2-2 4-2 6 0 2-2 4-2 6 0"/></>),
  cover: (<><path d="M3 13c3-6 15-6 18 0"/><line x1="3" y1="13" x2="21" y2="13"/><line x1="6" y1="13" x2="6" y2="20"/><line x1="18" y1="13" x2="18" y2="20"/></>),
  flyNet: (<><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="9" x2="20" y2="9" strokeDasharray="2 2"/><line x1="4" y1="15" x2="20" y2="15" strokeDasharray="2 2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>),
  cleanGround: (<><line x1="3" y1="19" x2="21" y2="19"/><path d="M6 15l4-7 3 2 4-5"/><circle cx="17" cy="5" r="1"/></>), sealedBag: (<><path d="M6 7h12l-1 14H7L6 7z"/><path d="M6 7l6-4 6 4"/><line x1="9" y1="11" x2="15" y2="11" strokeWidth="2.5"/></>),
  camera: (<><path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><circle cx="12" cy="14" r="3.5"/></>),
  rain: (<><path d="M19 13.5a4.5 4.5 0 0 0-2.5-8.2 6 6 0 0 0-11 2.2A4.5 4.5 0 0 0 6 15h13z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/></>),
  check: <polyline points="20 6 9 17 4 12"/>, cross: (<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  scan: (<><path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><line x1="4" y1="12" x2="20" y2="12" strokeDasharray="3 2"/></>),
  print: (<><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M6 14h12v7H6z"/></>), stamp: (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6" strokeDasharray="2 2"/></>),
  arrowLeft: (<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>), alert: (<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  smell: (<><path d="M6 10c0-2.5 2-4.5 4.5-4.5S15 7.5 15 10c0 4-5 8-5 8s-4-4-4-8z"/><path d="M18 7c1 1.5 1 3.5 0 5"/></>), eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>),
  hand: (<><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M6 14.5a4 4 0 0 0 4 4h4a6 6 0 0 0 6-6V9a2 2 0 0 0-2-2 2 2 0 0 0-2 2v3"/></>),
  bug: (<><rect x="8" y="9" width="8" height="10" rx="4"/><circle cx="12" cy="6" r="2.5"/><line x1="12" y1="9" x2="12" y2="19"/><line x1="5" y1="11" x2="8" y2="12"/><line x1="19" y1="11" x2="16" y2="12"/></>),
  refresh: <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
};

export const Icon = ({ name, size = 22, color = 'currentColor', className = '', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`icon icon-${name} ${className}`} aria-hidden="true" {...props}>
    {ICON_PATHS[name] || <circle cx="12" cy="12" r="4"/>}
  </svg>
);

export function Seal({ score, verified, size = 'md', className = '' }) {
  const { t } = useApp(), isNum = typeof score === 'number' && !isNaN(score), band = isNum ? bandOf(score) : null;
  const bCls = band === 'Gold' ? 'seal-gold' : band === 'Needs improvement' ? 'seal-needs-improvement' : 'seal-silver';
  const bLbl = band === 'Gold' ? 'sealBandGold' : band === 'Needs improvement' ? 'sealBandNeedsImprovement' : isNum ? 'sealBandSilver' : 'sealNoBatches';
  return (
    <div className={`seal-wrapper ${className}`}>
      <div className={`seal-circle seal-${size} ${bCls}`} role="img" aria-label={`Trust Score ${isNum ? score : 'None'}`}>
        <span className="seal-score notranslate" translate="no">{isNum ? score : '—'}</span>
        <span className="seal-label">{t(bLbl)}</span>
        {isNum && typeof verified === 'boolean' && (<span className={`seal-ribbon ${verified ? 'seal-verified-ribbon' : 'seal-provisional-ribbon'}`}>{verified ? `✓ ${t('verifiedBadgeShort')}` : t('provisionalBadge')}</span>)}
      </div>
    </div>
  );
}

export function ScoreBars({ hygiene = 0, quality = 0, className = '' }) {
  const { t } = useApp();
  const bars = [
    { label: t('hygieneScoreLabel'), val: Math.max(0, Math.min(100, Math.round(Number(hygiene) || 0))), color: 'var(--seaweed)' },
    { label: t('qualityScoreLabel'), val: Math.max(0, Math.min(100, Math.round(Number(quality) || 0))), color: 'var(--turmeric)', mid: '#8A7146' }
  ];
  return (
    <div className={`score-bars-container ${className}`} style={{ width: '100%', margin: '0.75rem 0' }}>
      {bars.map(({ label, val, color, mid }) => (
        <div key={label} style={{ marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</span><span className="notranslate" translate="no" style={{ fontWeight: 700, color, fontFamily: 'monospace' }}>{val}/100</span></div>
          <div style={{ width: '100%', height: 10, backgroundColor: 'var(--bone)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div style={{ width: `${val}%`, height: '100%', backgroundColor: val >= 80 ? color : val >= 50 ? (mid || 'var(--turmeric)') : 'var(--laterite)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BandChip({ band, claim, verified, className = '' }) {
  const { t } = useApp();
  const bCls = band === 'Gold' ? 'band-gold' : band === 'Needs improvement' ? 'band-needs-improvement' : 'band-silver';
  const lbl = band === 'Gold' ? 'bandGold' : band === 'Needs improvement' ? 'bandNeedsImprovement' : 'bandSilver';
  const isVer = verified === true || claim === 'Verified';
  return (
    <span className={`band-chip ${bCls} ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <Icon name={band === 'Needs improvement' ? 'alert' : 'check'} size={14} />
      <span>{t(lbl)}{(claim != null || verified !== undefined) && <span style={{ fontWeight: 500, opacity: 0.9 }}>, {(isVer ? t('claimVerified') : t('claimSelfDeclared')).toLowerCase()}</span>}</span>
    </span>
  );
}

export function Toast() {
  const { toast, hideToast } = useApp();
  return toast ? (
    <div className="toast-container" role="status" aria-live="polite">
      <div className={`toast toast-${toast.type || 'info'}`}><span>{toast.message}</span><button type="button" onClick={hideToast} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px 6px' }}>✕</button></div>
    </div>
  ) : null;
}

export function Modal({ isOpen, onClose, title, children }) {
  const { t } = useApp();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && isOpen && onClose();
    if (isOpen) { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3 className="modal-title">{title}</h3><button type="button" className="modal-close-btn" onClick={onClose} aria-label={t('close')}>✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const EmptyState = ({ icon = 'stamp', title, description, action }) => (
  <div className="card empty-state-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
    <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}><Icon name={icon} size={28} /></div>
    <h3 style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>{title}</h3>
    {description && <p style={{ color: '#556677', fontSize: '0.95rem', maxWidth: 360 }}>{description}</p>}
    {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
  </div>
);

export function ChecklistToggle({ icon, title, desc, points, value, onChange, hasError = false }) {
  const { t } = useApp();
  return (
    <div className="card checklist-card" style={{ marginBottom: '1rem', border: hasError ? '2px solid var(--laterite)' : '1px solid var(--line)', backgroundColor: 'var(--paper)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', flexShrink: 0 }}><Icon name={icon} size={22} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}><h4 style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>{title}</h4><span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--seaweed)', backgroundColor: '#E8F3ED', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>+{points} pts</span></div>
          <p style={{ fontSize: '0.875rem', color: '#556677', marginTop: '0.2rem', lineHeight: 1.4 }}>{desc}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.75rem' }}>
        <button type="button" onClick={() => onChange(true)} className="btn" style={{ minHeight: 48, backgroundColor: value === true ? 'var(--seaweed)' : 'var(--bone)', color: value === true ? '#fff' : 'var(--ink)', borderColor: value === true ? 'var(--seaweed)' : 'var(--line)', fontWeight: 700 }}><Icon name="check" size={18} color={value === true ? '#fff' : 'var(--seaweed)'} /><span>{t('yes')}</span></button>
        <button type="button" onClick={() => onChange(false)} className="btn" style={{ minHeight: 48, backgroundColor: value === false ? 'var(--laterite)' : 'var(--bone)', color: value === false ? '#fff' : 'var(--ink)', borderColor: value === false ? 'var(--laterite)' : 'var(--line)', fontWeight: 700 }}><Icon name="cross" size={18} color={value === false ? '#fff' : 'var(--laterite)'} /><span>{t('no')}</span></button>
      </div>
    </div>
  );
}

export function LangToggle() {
  const { lang, setLang } = useApp();
  return (
    <div className="lang-toggle notranslate" translate="no" role="group" aria-label="Language selection">
      <button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
      <button type="button" className={`lang-btn ${lang === 'kn' ? 'active' : ''}`} onClick={() => setLang('kn')}>ಕನ್ನಡ</button>
    </div>
  );
}

export function Header() {
  const { session, logout, t } = useApp(), navigate = useNavigate();
  return (
    <header className="header-bar">
      <div className="header-inner container-wide">
        <Link to="/" className="header-brand" aria-label="DryTrust Home">
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)', border: '2px solid var(--turmeric)' }}><Icon name="stamp" size={18} color="var(--paper)" /></div>
          <div><span className="brand-title notranslate" translate="no">DryTrust</span></div>
        </Link>
        <div className="header-actions">
          {session?.role === 'seller' && <Link to="/seller/dashboard" className="btn btn-secondary" style={{ minHeight: 36, padding: '0.25rem 0.65rem', fontSize: '0.85rem' }}>{t('seller')}</Link>}
          {session?.role === 'admin' && <Link to="/admin" className="btn btn-secondary" style={{ minHeight: 36, padding: '0.25rem 0.65rem', fontSize: '0.85rem' }}>{t('admin')}</Link>}
          {session && (<button type="button" className="btn btn-secondary" onClick={() => { logout(); navigate('/'); }} style={{ minHeight: 36, padding: '0.25rem 0.65rem', fontSize: '0.85rem' }} title={t('logout')}><Icon name="logout" size={16} /><span className="hide-on-mobile">{t('logout')}</span></button>)}
          <LangToggle />
        </div>
      </div>
    </header>
  );
}

export function BuyerCheck({ onReportClick }) {
  const { t } = useApp();
  const checks = [
    ['smell', t('buyerCheckSmellTitle'), t('buyerCheckSmellDesc')], ['eye', t('buyerCheckLookTitle'), t('buyerCheckLookDesc')],
    ['hand', t('buyerCheckFeelTitle'), t('buyerCheckFeelDesc')], ['bug', t('buyerCheckInsectsTitle'), t('buyerCheckInsectsDesc')]
  ];
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><Icon name="check" size={20} color="var(--seaweed)" /><h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>{t('buyerCheckTitle')}</h3></div>
      <p style={{ fontSize: '0.825rem', color: '#556677', marginBottom: '1rem', lineHeight: 1.4 }}>{t('buyerCheckSubtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {checks.map(([ic, title, desc]) => (
          <div key={ic} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0.75rem', backgroundColor: 'var(--bone)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--turmeric)', marginTop: 2 }}><Icon name={ic} size={20} /></div>
            <div><div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{title}</div><div style={{ fontSize: '0.825rem', color: '#556677', marginTop: '0.15rem', lineHeight: 1.35 }}>{desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
        <button type="button" className="btn btn-secondary btn-full" onClick={onReportClick} style={{ minHeight: 44, color: 'var(--laterite)', borderColor: 'var(--laterite)' }}><Icon name="alert" size={16} color="var(--laterite)" /><span>{t('buyerReportProblemBtn')}</span></button>
      </div>
    </div>
  );
}