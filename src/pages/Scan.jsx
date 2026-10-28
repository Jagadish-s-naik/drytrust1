// src/pages/Scan.jsx - QR scanner (camera, manual ID lookup, image upload fallback)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Icon } from '../ui.jsx';
import { useApp } from '../ctx.jsx';

export default function Scan() {
  const navigate = useNavigate(), { t, showToast } = useApp();
  const [camErr, setCamErr] = useState(false), [id, setId] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const scanRef = useRef(null), fileRef = useRef(null), doneRef = useRef(false);

  const onDecoded = (txt) => {
    if (doneRef.current || !txt) return;
    doneRef.current = true;
    if (scanRef.current?.isScanning) scanRef.current.stop().catch(() => {}).finally(() => { try { scanRef.current.clear(); } catch {} });
    if (txt.includes('#/b/')) return navigate(`/b/${txt.split('#/b/')[1]}`);
    const match = txt.match(/DT-[A-Z0-9]{6}/i);
    navigate(`/b/${match ? match[0].toUpperCase() : encodeURIComponent(txt.trim())}`);
  };

  useEffect(() => {
    let cancelled = false;
    const el = document.getElementById('camera-reader-viewport');
    if (el) el.innerHTML = '';
    (async () => {
      try {
        const qr = new Html5Qrcode('camera-reader-viewport');
        scanRef.current = qr;
        await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onDecoded, () => {});
        if (cancelled) { if (qr.isScanning) await qr.stop(); qr.clear(); }
      } catch { if (!cancelled) setCamErr(true); }
    })();

    return () => {
      cancelled = true;
      if (scanRef.current) {
        try {
          if (scanRef.current.isScanning) scanRef.current.stop().then(() => { try { scanRef.current.clear(); } catch {} }).catch(() => {});
          else try { scanRef.current.clear(); } catch {}
        } catch {}
      }
    };
  }, []);

  const onLookup = (e) => {
    e.preventDefault(); setErr('');
    const c = id.trim().toUpperCase();
    if (!c) return setErr('Please enter a batch ID');
    navigate(`/b/${c}`);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const q = new Html5Qrcode('qr-file-dummy');
      const res = await q.scanFile(file, true);
      q.clear(); onDecoded(res);
    } catch { showToast(t('errInvalidQrImage'), 'error'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="container-narrow">
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}><h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t('scanTitle')}</h1><p style={{ color: '#556677', fontSize: '0.9rem' }}>{t('scanSubtitle')}</p></div>
      <div id="qr-file-dummy" style={{ display: 'none' }} />
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', textAlign: 'center', backgroundColor: '#000', color: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div id="camera-reader-viewport" style={{ width: '100%', minHeight: camErr ? 0 : 280, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }} />
        {camErr && (
          <div style={{ padding: '2rem 1rem', color: 'var(--paper)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}><Icon name="camera" size={24} color="#fff" /></div>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.35rem' }}>{t('cameraFallbackTitle')}</h3>
            <p style={{ fontSize: '0.85rem', color: '#CBD5E1', maxWidth: 300, margin: '0 auto' }}>{t('cameraFallbackDesc')}</p>
          </div>
        )}
      </div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{t('manualIdTitle')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#556677', marginBottom: '0.85rem' }}>Locate the 8-character ID on the pack stamp (e.g. DT-A8K92F).</p>
        <form onSubmit={onLookup} noValidate>
          {err && <div className="form-error" style={{ marginBottom: '0.5rem' }}>{err}</div>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="form-input" value={id} onChange={(e) => setId(e.target.value)} placeholder={t('batchIdInputPlaceholder')} style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace' }} />
            <button type="submit" className="btn btn-primary" style={{ minWidth: 100 }}>{t('searchBatchBtn')}</button>
          </div>
        </form>
      </div>
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{t('uploadQrTitle')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#556677', marginBottom: '0.85rem' }}>Select or snap a photo of the QR label from your photo library.</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        <button type="button" className="btn btn-secondary btn-full" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="scan" size={18} /><span>{busy ? t('loading') : t('uploadQrBtn')}</span></button>
      </div>
    </div>
  );
}
