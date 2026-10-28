// src/pages/NewBatch.jsx - Create new dry fish batch with quality metrics, live camera & score preview
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChecklistToggle, ScoreBars, Seal, Icon } from '../ui.jsx';
import { generateBatchId, saveBatch, compressImage, captureFrameFromVideo } from '../data.js';
import { hygieneScore, qualityScore, batchScore } from '../score.js';
import { useApp } from '../ctx.jsx';

const FISH = ['Bombil', 'Mackerel', 'Sardine', 'Prawn', 'Anchovy', 'Other'];

function Camera({ slotNumber, title, description, photo, onChange, hasError }) {
  const { t } = useApp();
  const [isOpen, setIsOpen] = useState(false), [err, setErr] = useState(''), [loading, setLoading] = useState(false);
  const videoRef = useRef(null), streamRef = useRef(null), fileRef = useRef(null);
  const stopTracks = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((tk) => tk.stop()); streamRef.current = null; } };
  useEffect(() => () => stopTracks(), []);
  const openCam = async () => {
    setErr(''); setIsOpen(true); setLoading(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) throw new Error('No camera API');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setLoading(false);
    } catch { stopTracks(); setIsOpen(false); setLoading(false); setErr(t('cameraDeniedFallbackNotice')); fileRef.current?.click(); }
  };
  const savePhoto = async (dataUrl, live) => {
    setLoading(true);
    const coords = await new Promise((res) => {
      if (!navigator?.geolocation) return res({ lat: null, lon: null });
      navigator.geolocation.getCurrentPosition((p) => res({ lat: Number(p.coords.latitude.toFixed(5)), lon: Number(p.coords.longitude.toFixed(5)) }), () => res({ lat: null, lon: null }), { timeout: 5000 });
    });
    stopTracks(); setIsOpen(false); setLoading(false);
    onChange({ dataUrl, at: new Date().toISOString(), lat: coords.lat, lon: coords.lon, live });
  };
  const capture = () => { if (videoRef.current) { const d = captureFrameFromVideo(videoRef.current); if (d) savePhoto(d, true); } };
  const onFile = async (e) => { const f = e.target.files?.[0]; if (f) { try { const d = await compressImage(f); if (d) savePhoto(d, false); } catch { setLoading(false); } } };
  const setDemo = (live) => savePhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23F3F7F5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="%232E7D52">${encodeURIComponent(title)}</text></svg>`, live);
  return (
    <div className={`card ${hasError ? 'card-error' : ''}`} style={{ padding: '1rem', marginBottom: '1rem', border: hasError ? '2px solid var(--laterite)' : '1px solid var(--line)', backgroundColor: '#fff' }}>
      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '0.4rem' }}>
        <div><span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--seaweed)', textTransform: 'uppercase' }}>Photo {slotNumber} of 3</span><h4 style={{ fontSize: '1rem', margin: '0.1rem 0' }}>{title}</h4>{description && <p style={{ fontSize: '0.8rem', color: '#556677', margin: 0 }}>{description}</p>}</div>
        {photo && <span className={`badge ${photo.live ? 'badge-verified' : 'badge-provisional'}`}>{photo.live ? t('livePhotoBadge') : t('uploadedPhotoBadge')}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      {photo ? (
        <div style={{ marginTop: '0.75rem' }}>
          <img src={photo.dataUrl} alt={title} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', display: 'block' }} />
          <div className="flex-between" style={{ marginTop: '0.5rem' }}><span style={{ fontSize: '0.75rem', color: '#556677' }}>{!photo.live && t('uploadedFewerPointsNote')}</span><button type="button" className="btn btn-secondary" onClick={() => onChange(null)} style={{ minHeight: 34, padding: '0.2rem 0.75rem', fontSize: '0.8rem' }}><Icon name="refresh" size={14} /><span>{t('retakePhoto')}</span></button></div>
        </div>
      ) : isOpen ? (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', minHeight: 220 }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
            {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)' }}>{t('loading')}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={capture} disabled={loading} style={{ flex: 2, minHeight: 46 }}><Icon name="camera" size={18} /><span>{t('captureBtn')}</span></button>
            <button type="button" className="btn btn-secondary" onClick={() => { stopTracks(); setIsOpen(false); }} style={{ flex: 1, minHeight: 46 }}>{t('cancel')}</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '0.75rem' }}>
          {err && <div style={{ fontSize: '0.8rem', color: 'var(--laterite)', marginBottom: '0.5rem' }}>{err}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary btn-full" onClick={openCam} style={{ minHeight: 46 }}><Icon name="camera" size={18} /><span>{t('openCameraBtn')}</span></button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => fileRef.current?.click()} style={{ minHeight: 38, fontSize: '0.825rem' }}><span>{t('uploadGalleryFallbackBtn')}</span></button>
            <div className="grid-2" style={{ gap: '0.4rem', marginTop: '0.2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDemo(true)} style={{ minHeight: 34, fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>{t('demoLivePhotoBtn')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setDemo(false)} style={{ minHeight: 34, fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>{t('demoSamplePhotoBtn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewBatch() {
  const { session, t, showToast } = useApp(), navigate = useNavigate(), today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ fishType: 'Mackerel', customFish: '', weightKg: '', pricePerKg: '', dryingStart: today, packedDate: today, freshness: 'same_day', salting: 'standard', dryingMethod: 'solar_tent', useByMonths: 3, moisture: '' });
  const [checklist, setChecklist] = useState({ raisedRack: null, covered: null, protected: null, cleanArea: null, sealedPack: null });
  const [photos, setPhotos] = useState([null, null, null]);
  const [err, setErr] = useState(''), [chErr, setChErr] = useState(false), [busy, setBusy] = useState(false);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setP = (idx, val) => setPhotos((p) => { const n = [...p]; n[idx] = val; return n; });
  const clObj = Object.fromEntries(Object.entries(checklist).map(([k, v]) => [k, v === true]));
  const previewBatch = {
    fishType: form.fishType === 'Other' ? (form.customFish.trim() || 'Other') : form.fishType,
    dryingStart: form.dryingStart, packedDate: form.packedDate, useByMonths: Number(form.useByMonths) || 3,
    freshness: form.freshness, salting: form.salting, dryingMethod: form.dryingMethod,
    moisture: form.moisture !== '' ? parseFloat(form.moisture) : null, moistureBy: form.moisture !== '' ? 'seller' : null,
    checklist: clObj, photos: photos.filter(Boolean), verified: false, officerCheck: null
  };
  const H = hygieneScore(previewBatch), Q = qualityScore(previewBatch), liveScore = batchScore(previewBatch, []);
  const chItems = [
    ['raisedRack', 'raisedRack', t('checkRaisedRack'), t('checkRaisedRackDesc'), 25],
    ['covered', 'cover', t('checkCovered'), t('checkCoveredDesc'), 15],
    ['protected', 'flyNet', t('checkProtected'), t('checkProtectedDesc'), 15],
    ['cleanArea', 'cleanGround', t('checkCleanArea'), t('checkCleanAreaDesc'), 15],
    ['sealedPack', 'sealedBag', t('checkSealedPack'), t('checkSealedPackDesc'), 15]
  ];
  const handleSubmit = (e) => {
    e.preventDefault(); if (busy) return;
    setErr(''); setChErr(false);
    if (Object.values(checklist).some((v) => v === null)) { setChErr(true); setErr(t('errAllChecklistReq')); return window.scrollTo({ top: 300, behavior: 'smooth' }); }
    const w = parseFloat(form.weightKg), p = parseFloat(form.pricePerKg);
    if (isNaN(w) || w <= 0) return setErr(t('errWeightPositive'));
    if (isNaN(p) || p <= 0) return setErr(t('errPricePositive'));
    if (!form.dryingStart || form.dryingStart > today) return setErr(t('errFutureDate'));
    if (!form.packedDate || form.packedDate > today) return setErr(t('errPackedFuture'));
    if (form.packedDate < form.dryingStart) return setErr(t('errPackedBeforeStart'));
    setBusy(true);
    try {
      const id = generateBatchId();
      saveBatch({ id, unitId: session.unitId, weightKg: w, pricePerKg: p, ...previewBatch, createdAt: new Date().toISOString() });
      showToast(t('batchCreatedToast'), 'success');
      navigate(`/b/${id}/result`);
    } catch { setErr('Could not save batch. Please try again.'); setBusy(false); }
  };
  return (
    <div className="container-narrow">
      <div className="row" style={{ marginBottom: '1.25rem' }}><Link to="/seller/dashboard" className="btn btn-secondary" style={{ minHeight: 38, padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}><Icon name="arrowLeft" size={16} /><span>{t('back')}</span></Link><h1 style={{ fontSize: '1.4rem', margin: 0 }}>{t('recordBatchHeader')}</h1></div>
      <form onSubmit={handleSubmit} noValidate>
        {err && (<div className="card" style={{ backgroundColor: '#FDE8E4', borderColor: 'var(--laterite)', color: 'var(--laterite)', marginBottom: '1.25rem', padding: '0.85rem 1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="alert" size={18} color="var(--laterite)" /><span style={{ fontWeight: 600 }}>{err}</span></div></div>)}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>1. Batch Details</h3>
          <div className="form-group"><label className="form-label" htmlFor="fish-type">{t('fishType')}</label><select id="fish-type" className="form-select" value={form.fishType} onChange={(e) => setF('fishType', e.target.value)}>{FISH.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
          {form.fishType === 'Other' && (<div className="form-group"><label className="form-label" htmlFor="custom-fish">{t('customFishName')}</label><input id="custom-fish" type="text" className="form-input" value={form.customFish} onChange={(e) => setF('customFish', e.target.value)} placeholder="e.g. Ribbon Fish" required /></div>)}
          <div className="grid-2">
            {[
              ['weightKg', 'batchWeightLabel', 'number', 'e.g. 85', { step: '0.5', min: '1' }], ['pricePerKg', 'priceLabel', 'number', 'e.g. 340', { min: '1' }],
              ['dryingStart', 'dryingStartDateLabel', 'date', '', { max: today }], ['packedDate', 'packedDateLabel', 'date', '', { max: today }]
            ].map(([f, lbl, typ, ph, attrs]) => (<div key={f} className="form-group"><label className="form-label" htmlFor={f}>{t(lbl)}</label><input id={f} type={typ} className="form-input" value={form[f]} onChange={(e) => setF(f, e.target.value)} placeholder={ph} {...attrs} required /></div>))}
          </div>
        </div>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>2. Quality Metrics</h3>
          {[
            ['freshness', 'freshnessLabel', [['same_day', 'freshSameDay'], ['iced_1day', 'freshIced1Day'], ['older', 'freshOlder']]],
            ['salting', 'saltingLabel', [['standard', 'saltingStandard'], ['light', 'saltingLight'], ['heavy', 'saltingHeavy'], ['none', 'saltingNone']]],
            ['dryingMethod', 'dryingMethodLabel', [['solar_tent', 'methodSolarTent'], ['mechanical', 'methodMechanical'], ['open_sun', 'methodOpenSun']]]
          ].map(([f, lbl, opts]) => (<div key={f} className="form-group"><label className="form-label">{t(lbl)}</label><select className="form-select" value={form[f]} onChange={(e) => setF(f, e.target.value)}>{opts.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select></div>))}
          <div className="grid-2">
            <div className="form-group"><label className="form-label">{t('useByLabel')}</label><select className="form-select" value={form.useByMonths} onChange={(e) => setF('useByMonths', Number(e.target.value))}><option value={1}>1 month</option><option value={3}>3 months</option><option value={6}>6 months</option></select></div>
            <div className="form-group"><label className="form-label">{t('moisturePercentLabel')}</label><input type="number" step="0.1" min="5" max="40" className="form-input" placeholder="e.g. 13.5 (opt)" value={form.moisture} onChange={(e) => setF('moisture', e.target.value)} /></div>
          </div>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>3. Hygiene Checklist (All Required)</h3>
          <p style={{ fontSize: '0.85rem', color: '#556677', marginBottom: '0.85rem' }}>Confirm the 5 mandatory processing standards.</p>
          {chItems.map(([k, icon, title, desc, pts]) => (<ChecklistToggle key={k} icon={icon} title={title} desc={desc} points={pts} value={checklist[k]} onChange={(val) => setChecklist((p) => ({ ...p, [k]: val }))} hasError={chErr && checklist[k] === null} />))}
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>4. Verification Photos</h3>
          <p style={{ fontSize: '0.85rem', color: '#556677', marginBottom: '0.85rem' }}>Live camera capture with GPS earns full points (+15 pts).</p>
          {[[t('photoDryingTitle'), t('photoDryingDesc')], [t('photoNetTitle'), t('photoNetDesc')], [t('photoPackedTitle'), t('photoPackedDesc')]].map(([title, desc], idx) => (<Camera key={idx} slotNumber={idx + 1} title={title} description={desc} photo={photos[idx]} onChange={(p) => setP(idx, p)} />))}
        </div>
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem 1rem', border: '2px solid var(--ink)' }}>
          <span style={{ fontSize: '0.8rem', color: '#556677', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Score Preview</span>
          <div style={{ margin: '0.85rem 0' }}><Seal score={liveScore} size="lg" /></div>
          <div style={{ maxWidth: 360, margin: '0.5rem auto' }}><ScoreBars hygiene={H} quality={Q} /></div>
          <p style={{ fontSize: '0.8rem', color: '#556677', marginTop: '0.5rem' }}>{t('provisionalNotice')}</p>
        </div>
        <button type="submit" className="btn btn-accent btn-full" disabled={busy} style={{ minHeight: 52, fontSize: '1.1rem', boxShadow: 'var(--shadow-card)', marginBottom: '2rem' }}><Icon name="check" size={20} /><span>{busy ? t('loading') : t('recordBatchBtn')}</span></button>
      </form>
    </div>
  );
}