// src/pages/Batch.jsx - Merged batch views (QR label #/b/:id/result & public #/b/:id) + Order screen
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { Icon, Seal, BandChip, ScoreBars, BuyerCheck, Modal, EmptyState } from '../ui.jsx';
import { getBatchById, getUnitById, getReportsByBatchId, getOrdersByBatchId, saveReport, saveOrder, buildQrUrl, generateQrDataUrl, parseQrPayload, formatDate, formatRupees, formatKg, checkLocationStatus } from '../data.js';
import { batchScore, bandOf, hygieneScore, qualityScore, claimOf, calculateDryingDays } from '../score.js';
import { useApp } from '../ctx.jsx';

const HYGIENE = [
  ['raisedRack', 'checkRaisedRack', 'Raised rack drying (+25)'], ['covered', 'checkCovered', 'Covered with clean mesh (+15)'],
  ['protected', 'checkProtected', 'Flies & animals protected (+15)'], ['cleanArea', 'checkCleanArea', 'Clean perimeter (+15)'],
  ['sealedPack', 'checkSealedPack', 'Moisture-proof sealed pack (+15)']
];

export default function Batch() {
  const { batchId } = useParams(), location = useLocation(), navigate = useNavigate(), { t, showToast } = useApp();
  const isResult = location.pathname.endsWith('/result');
  const [batch, setBatch] = useState(null), [unit, setUnit] = useState(null);
  const [reports, setReports] = useState([]), [orders, setOrders] = useState([]);
  const [limited, setLimited] = useState(false), [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState({ dataUrl: '', url: '' });
  const [repModal, setRepModal] = useState(false), [rep, setRep] = useState({ reason: 'smell', note: '' });
  const [buyModal, setBuyModal] = useState(false), [buy, setBuy] = useState({ name: '', phone: '', qty: '', err: '' });
  useEffect(() => {
    const b = getBatchById(batchId);
    if (b) {
      setBatch(b); setUnit(getUnitById(b.unitId)); setReports(getReportsByBatchId(b.id)); setOrders(getOrdersByBatchId(b.id));
      setLimited(false); setNotFound(false);
      if (isResult && b.unitId) {
        const u = getUnitById(b.unitId);
        if (u) { const uStr = buildQrUrl(b, u); setQr((p) => ({ ...p, url: uStr })); generateQrDataUrl(uStr, 240).then((d) => d && setQr((p) => ({ ...p, dataUrl: d }))); }
      }
      return;
    }
    if (!isResult) {
      const pStr = new URLSearchParams(location.search).get('d') || (window.location.hash.includes('?') && new URLSearchParams(window.location.hash.split('?')[1]).get('d'));
      if (pStr) {
        const parsed = parseQrPayload(pStr);
        if (parsed?.batch && parsed?.unit) { setBatch({ ...parsed.batch, id: batchId }); setUnit(parsed.unit); setReports([]); setOrders([]); setLimited(true); setNotFound(false); return; }
      }
    }
    setNotFound(true);
  }, [batchId, location.search, isResult]);
  if (notFound) return <div className="container-narrow"><EmptyState icon="scan" title={t('batchNotFoundTitle')} description={t('batchNotFoundDesc')} action={<Link to="/scan" className="btn btn-primary">{t('scanAnotherBtn')}</Link>} /></div>;
  if (!batch || !unit) return null;
  const score = batchScore(batch, reports), band = bandOf(score), H = hygieneScore(batch), Q = qualityScore(batch);
  const claim = claimOf(batch), isVer = Boolean(batch.officerCheck || batch.verified === true), cl = batch.officerCheck?.checklist || batch.checklist || {};
  const totalOrd = orders.reduce((s, o) => s + (Number(o.qtyKg) || 0), 0), remKg = Math.max(0, (batch.weightKg || 0) - totalOrd), isSoldOut = remKg <= 0;
  const useBy = new Date(batch.packedDate || batch.dryingStart || new Date());
  useBy.setMonth(useBy.getMonth() + (Number(batch.useByMonths) || 3));
  const isExpired = new Date() > useBy, dDays = calculateDryingDays(batch.dryingStart, batch.packedDate);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(qr.url); showToast(t('linkCopiedToast'), 'success'); }
    catch { showToast(t('linkCopiedToast'), 'info'); }
  };
  const submitReport = (e) => {
    e.preventDefault(); if (limited) return;
    const rObj = { id: `REP-${Date.now().toString().slice(-6)}`, batchId: batch.id, reason: rep.reason, note: rep.note.trim(), createdAt: new Date().toISOString() };
    saveReport(rObj); setReports((p) => [rObj, ...p]); setRepModal(false); setRep({ reason: 'smell', note: '' }); showToast(t('reportSubmittedToast'), 'success');
  };
  const proceedBuy = (e) => {
    e.preventDefault();
    if (!buy.name.trim()) return setBuy((p) => ({ ...p, err: 'Please enter your name or shop name.' }));
    if (!/^[6-9]\d{9}$/.test(buy.phone.trim())) return setBuy((p) => ({ ...p, err: 'Please enter a valid 10-digit mobile number.' }));
    const q = parseFloat(buy.qty);
    if (isNaN(q) || q <= 0) return setBuy((p) => ({ ...p, err: 'Please enter a valid quantity in kg.' }));
    if (q > remKg) return setBuy((p) => ({ ...p, err: `Quantity exceeds available stock (${remKg} kg remaining).` }));
    setBuyModal(false);
    navigate('/order/summary', { state: { batchId: batch.id, fishType: batch.fishType, unitName: unit.unitName, pricePerKg: batch.pricePerKg, buyerName: buy.name.trim(), phone: buy.phone.trim(), qtyKg: q } });
  };
  const heroDetails = (
    <>
      <span style={{ fontSize: '0.85rem', color: '#556677', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit.town} • {unit.unitName}</span>
      <h1 style={{ fontSize: '1.65rem', margin: '0.2rem 0' }}>{batch.fishType} ({formatKg(batch.weightKg)})</h1>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: isResult ? '1.1rem' : '0.95rem', color: isResult ? 'var(--turmeric)' : '#556677' }}>{batch.id}</div>
      <div style={{ margin: '0.5rem 0' }}><span className={`badge ${isVer ? 'badge-verified' : 'badge-provisional'}`}>{isVer && <Icon name="check" size={14} color="var(--seaweed)" />}{isVer ? (isResult ? t('verifiedBadge') : (batch.officerCheck?.visitedAt ? t('verifiedOnDate', { date: formatDate(batch.officerCheck.visitedAt) }) : t('verifiedBadge'))) : (isResult ? t('unverifiedBadge') : t('claimSelfDeclared'))}</span></div>
      <div style={{ margin: isResult ? '0.85rem 0' : '1rem 0 0.5rem' }}><Seal score={score} verified={isVer} size="lg" /></div>
      <div style={{ maxWidth: 360, margin: '0 auto 0.75rem' }}><ScoreBars hygiene={H} quality={Q} /></div>
      <p style={{ fontSize: '0.825rem', color: '#556677', maxWidth: 380, margin: '0.35rem auto 1rem', lineHeight: 1.4 }}>{isVer ? t('verifiedOfficerNotice') : t('provisionalNotice')}</p>
    </>
  );
  if (isResult) {
    return (
      <>
        <div className="container-narrow no-print">
          <div className="flex-between" style={{ marginBottom: '1rem' }}><Link to="/seller/dashboard" className="btn btn-secondary" style={{ minHeight: 38, padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}><Icon name="arrowLeft" size={16} /><span>{t('back')}</span></Link><BandChip band={band} claim={claim} /></div>
          <div className="card" style={{ textAlign: 'center', padding: '1.75rem 1.25rem', marginBottom: '1.25rem', border: '2px solid var(--ink)' }}>
            {heroDetails}
            <div style={{ backgroundColor: '#fff', padding: '0.75rem', display: 'inline-block', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', margin: '0.5rem 0' }}>{qr.dataUrl ? <img src={qr.dataUrl} alt={`QR ${batch.id}`} style={{ width: 220, height: 220, display: 'block' }} /> : <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('loading')}</div>}</div>
            <p style={{ fontSize: '0.8rem', color: '#556677', marginTop: '0.4rem' }}>Scan with any camera to verify batch proof</p>
            <div style={{ marginTop: '1.25rem', textAlign: 'left', backgroundColor: 'var(--bone)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--ink)' }}>Batch Specifications:</div>
              <div className="grid-2" style={{ gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                <div><strong>Freshness:</strong> {batch.freshness || 'N/A'}</div><div><strong>Salting:</strong> {batch.salting || 'Standard'}</div>
                <div><strong>Method:</strong> {batch.dryingMethod || 'Solar tent'}</div><div><strong>Moisture:</strong> {batch.moisture != null ? `${batch.moisture}% (${batch.moistureBy || 'seller'})` : 'Not measured'}</div>
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'var(--ink)' }}>Hygiene Checklist:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.35rem' }}>{HYGIENE.map(([k, , label]) => (<div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name={cl[k] ? 'check' : 'cross'} size={16} color={cl[k] ? 'var(--seaweed)' : 'var(--laterite)'} /><span>{label}</span></div>))}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button type="button" className="btn btn-primary btn-full" onClick={() => window.print()} style={{ minHeight: 48 }}><Icon name="print" size={18} /><span>{t('printLabelBtn')}</span></button>
            <button type="button" className="btn btn-secondary btn-full" onClick={copyLink} style={{ minHeight: 48 }}><span>{t('copyLinkBtn')}</span></button>
            <Link to={`/b/${batch.id}`} className="btn btn-secondary btn-full" style={{ minHeight: 48 }}><span>{t('openPublicBtn')}</span></Link>
          </div>
        </div>
        <div className="printable-label-wrapper print-only">
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 4, marginBottom: 8 }}><div style={{ fontSize: 18, fontWeight: 'bold', fontFamily: 'serif' }}>DryTrust™</div><div style={{ fontSize: 12 }}>Coastal Karnataka Trust Verified Label</div></div>
          <div className="flex-between" style={{ marginBottom: 6 }}><div><div style={{ fontSize: 14, fontWeight: 'bold' }}>{unit.unitName}</div><div style={{ fontSize: 12 }}>{unit.town}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, fontWeight: 'bold' }}>{band} TIER</div><div style={{ fontSize: 10, color: '#333' }}>{claim}</div></div></div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '8px 0' }}>{qr.dataUrl && <img src={qr.dataUrl} alt="QR" style={{ width: 120, height: 120, display: 'block' }} />}<Seal score={score} verified={isVer} size="md" /></div>
          <div className="grid-2" style={{ borderTop: '1px solid #000', paddingTop: 6, fontSize: 11, rowGap: 3 }}>
            <div><strong>Batch:</strong> {batch.id}</div><div><strong>Fish:</strong> {batch.fishType}</div><div><strong>Weight:</strong> {batch.weightKg} kg</div><div><strong>Drying Date:</strong> {formatDate(batch.dryingStart)}</div>
            <div><strong>Packed Date:</strong> {formatDate(batch.packedDate || batch.dryingStart)}</div><div><strong>Use By:</strong> {batch.useByMonths || 3} months</div><div><strong>Moisture:</strong> {batch.moisture != null ? `${batch.moisture}%` : 'Not measured'}</div><div><strong>Status:</strong> {claim}</div>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="container-narrow">
      <div className="flex-between" style={{ marginBottom: '0.85rem' }}>
        <Link to="/scan" className="btn btn-secondary" style={{ minHeight: 36, padding: '0.2rem 0.65rem', fontSize: '0.85rem' }}><Icon name="arrowLeft" size={16} /><span>{t('back')}</span></Link>
        <span className={`badge ${isVer ? 'badge-verified' : 'badge-provisional'}`}>{isVer && <Icon name="check" size={14} color="var(--seaweed)" />}<span>{isVer ? (batch.officerCheck?.visitedAt ? t('verifiedOnDate', { date: formatDate(batch.officerCheck.visitedAt) }) : t('verifiedBadge')) : t('claimSelfDeclared')}</span></span>
      </div>
      {limited && <div style={{ backgroundColor: '#FEF9E7', border: '1px solid #E6B94D', color: '#8A5D00', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{t('limitedViewNotice')}</div>}
      {isExpired && <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="alert" size={18} color="#B45309" /><span>{t('pastUseByWarning')}</span></div>}
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1.25rem', marginBottom: '1.25rem' }}>
        {heroDetails}
        <div className="grid-2" style={{ marginTop: '1rem', textAlign: 'left', borderTop: '1px solid var(--line)', paddingTop: '0.85rem', fontSize: '0.875rem' }}>
          <div><div style={{ color: '#556677' }}>{t('pricePerKg')}</div><div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>{formatRupees(batch.pricePerKg)}</div></div>
          <div><div style={{ color: '#556677' }}>{t('useByLabel')}</div><div style={{ fontWeight: 600, color: isExpired ? 'var(--laterite)' : 'var(--ink)' }}>{formatDate(useBy.toISOString().split('T')[0])}</div></div>
        </div>
        {!limited && <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: isSoldOut ? 'var(--laterite)' : 'var(--seaweed)', fontWeight: 600 }}>{isSoldOut ? t('soldOutBtn') : t('remainingKg', { kg: remKg })}</div>}
      </div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('qualitySpecsTitle')}</h3>
        <div className="grid-2" style={{ fontSize: '0.85rem' }}>
          {[
            [t('freshnessLabel'), { same_day: t('freshSameDay'), iced_1day: t('freshIced1Day'), older: t('freshOlder') }[batch.freshness] || t('freshSameDay')],
            [t('saltingLabel'), { standard: t('saltingStandard'), light: t('saltingLight'), heavy: t('saltingHeavy'), none: t('saltingNone') }[batch.salting] || t('saltingStandard')],
            [t('dryingMethodLabel'), { mechanical: t('methodMechanical'), solar_tent: t('methodSolarTent'), open_sun: t('methodOpenSun') }[batch.dryingMethod] || t('methodSolarTent')],
            [t('dryingDurationLabel'), `${dDays} ${dDays === 1 ? t('daySingular') : t('daysPlural')}`],
            [t('packedDateLabel'), formatDate(batch.packedDate || batch.dryingStart)],
            [t('moisturePercentLabel'), batch.moisture != null ? `${batch.moisture}% (${batch.moistureBy === 'officer' ? t('officerVerifiedMoisture') : t('sellerTestedMoisture')})` : <span style={{ color: '#556677', fontStyle: 'italic' }}>{t('notMeasured')}</span>]
          ].map(([lbl, val], idx) => (<div key={idx} style={{ padding: '0.5rem', backgroundColor: 'var(--bone)', borderRadius: 'var(--radius-sm)' }}><span style={{ color: '#556677', display: 'block', fontSize: '0.75rem' }}>{lbl}</span><strong>{val}</strong></div>))}
        </div>
        <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', backgroundColor: '#F0F5F8', borderRadius: 'var(--radius-sm)', border: '1px solid #D1DFE9', fontSize: '0.8rem', color: '#1B3B54' }}><strong>💡 {t('storageAdviceTitle')}:</strong> {t('storageAdviceText')}</div>
      </div>
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{t('checklistSectionTitle')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {HYGIENE.map(([k, keyLabel]) => (<div key={k} className="flex-between" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--line)' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}><Icon name={k} size={20} /><span>{t(keyLabel)}</span></div><div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: cl[k] ? 'var(--seaweed)' : 'var(--laterite)' }}><Icon name={cl[k] ? 'check' : 'cross'} size={18} color={cl[k] ? 'var(--seaweed)' : 'var(--laterite)'} /><span>{cl[k] ? t('yes') : t('no')}</span></div></div>))}
        </div>
      </div>
      {!limited && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.65rem' }}>{t('photosSectionTitle')}</h3>
          {Array.isArray(batch.photos) && batch.photos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {batch.photos.map((p, idx) => {
                const src = typeof p === 'string' ? p : p?.dataUrl, isL = typeof p === 'object' && p?.live === true, locSt = checkLocationStatus(p?.lat, p?.lon, unit.lat, unit.lon, 25);
                const locTxt = locSt === 'near' ? t('photoNearTown', { town: unit.town }) : locSt === 'mismatch' ? t('photoLocationMismatch') : t('photoLocationUnavailable');
                const titles = [t('photoDryingTitle'), t('photoNetTitle'), t('photoPackedTitle')];
                return (
                  <div key={idx} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)', backgroundColor: 'var(--bone)', padding: '0.5rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.4rem' }}><span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{titles[idx] || `Photo ${idx + 1}`}</span><span className={`badge ${isL ? 'badge-verified' : 'badge-provisional'}`}>{isL ? t('livePhotoBadge') : t('uploadedPhotoBadge')}</span></div>
                    <img src={src} alt={`Batch photo ${idx + 1}`} style={{ width: '100%', height: 'auto', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--radius-sm)', display: 'block' }} />
                    <div className="flex-between" style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#556677' }}><span>📍 {locTxt}</span>{p?.at && <span>{formatDate(p.at, true)}</span>}</div>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#556677', fontSize: '0.9rem', fontStyle: 'italic', padding: '0.5rem 0' }}>{t('noPhotosAdded')}</p>}
        </div>
      )}
      <BuyerCheck onReportClick={() => setRepModal(true)} />
      <div style={{ marginBottom: '2rem' }}><button type="button" className="btn btn-accent btn-full" disabled={limited || isSoldOut} onClick={() => setBuyModal(true)} style={{ minHeight: 52, fontSize: '1.05rem', boxShadow: 'var(--shadow-card)' }}><span>{isSoldOut ? t('soldOutBtn') : t('requestBuyBtn')}</span></button></div>
      <Modal isOpen={repModal} onClose={() => setRepModal(false)} title={t('reportModalTitle')}>
        <form onSubmit={submitReport}>
          <div className="form-group"><label className="form-label" htmlFor="rep-reason">{t('reportReasonLabel')}</label><select id="rep-reason" className="form-select" value={rep.reason} onChange={(e) => setRep((p) => ({ ...p, reason: e.target.value }))}><option value="smell">{t('reasonSmell')}</option><option value="dirt">{t('reasonDirt')}</option><option value="insects">{t('reasonInsects')}</option><option value="other">{t('reasonOther')}</option></select></div>
          <div className="form-group"><label className="form-label" htmlFor="rep-note">{t('reportNoteLabel')}</label><textarea id="rep-note" className="form-textarea" value={rep.note} onChange={(e) => setRep((p) => ({ ...p, note: e.target.value }))} placeholder={t('reportNotePlaceholder')} /></div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}><button type="button" className="btn btn-secondary" onClick={() => setRepModal(false)} style={{ flex: 1 }}>{t('cancel')}</button><button type="submit" className="btn btn-danger" style={{ flex: 1 }}>{t('submitReportBtn')}</button></div>
        </form>
      </Modal>
      <Modal isOpen={buyModal} onClose={() => setBuyModal(false)} title={t('buyModalTitle')}>
        <form onSubmit={proceedBuy}>
          {buy.err && <div style={{ backgroundColor: '#FDE8E4', color: 'var(--laterite)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>{buy.err}</div>}
          <div className="form-group"><label className="form-label" htmlFor="buy-name">{t('buyerNameLabel')}</label><input id="buy-name" type="text" className="form-input" value={buy.name} onChange={(e) => setBuy((p) => ({ ...p, name: e.target.value, err: '' }))} placeholder="e.g. Malpe Fishland" required /></div>
          <div className="form-group"><label className="form-label" htmlFor="buy-phone">{t('buyerPhoneLabel')}</label><input id="buy-phone" type="tel" maxLength={10} className="form-input" value={buy.phone} onChange={(e) => setBuy((p) => ({ ...p, phone: e.target.value, err: '' }))} placeholder="10-digit number" required /></div>
          <div className="form-group"><label className="form-label" htmlFor="buy-qty">{t('buyQtyLabel')}</label><input id="buy-qty" type="number" step="0.5" min="0.5" max={remKg} className="form-input" value={buy.qty} onChange={(e) => setBuy((p) => ({ ...p, qty: e.target.value, err: '' }))} placeholder={`Max ${remKg} kg`} required /><span className="form-helper">{t('maxAvailableNote', { kg: remKg })}</span></div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>{t('continueToOrderSummary')}</button>
        </form>
      </Modal>
    </div>
  );
}

export function Order() {
  const location = useLocation(), { t, showToast } = useApp();
  const [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(null), state = location.state;
  if (!state && !confirmed) return <div className="container-narrow" style={{ textAlign: 'center', padding: '2rem 1rem' }}><p>No pending order found.</p><Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t('goHome')}</Link></div>;
  const qty = Number(state?.qtyKg) || 0, price = Number(state?.pricePerKg) || 0, total = Math.round(qty * price), fee = Math.round(total * 0.06), sellerGets = total - fee;
  const handleConfirm = () => {
    if (busy || confirmed) return;
    setBusy(true);
    try {
      const o = { id: `ORD-${Date.now().toString().slice(-6)}`, batchId: state.batchId, buyerName: state.buyerName, phone: state.phone, qtyKg: qty, pricePerKg: price, total, platformFee: fee, sellerGets, status: 'Confirmed (demo)', createdAt: new Date().toISOString() };
      saveOrder(o); setConfirmed(o); showToast('Order confirmed successfully!', 'success');
    } catch { showToast('Could not record order.', 'error'); }
    finally { setBusy(false); }
  };
  if (confirmed) {
    return (
      <div className="container-narrow">
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', border: '2px solid var(--seaweed)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#E8F3ED', color: 'var(--seaweed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}><Icon name="check" size={32} color="var(--seaweed)" /></div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{t('orderSuccessTitle')}</h1>
          <p style={{ color: '#556677', fontSize: '0.95rem', marginBottom: '1.25rem' }}>{t('orderSuccessDesc')}</p>
          <div style={{ backgroundColor: 'var(--bone)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
            <div style={{ fontSize: '0.8rem', color: '#556677' }}>{t('orderRefId')}</div><div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink)' }}>{confirmed.id}</div>
            <div style={{ fontSize: '0.85rem', color: '#445566', marginTop: '0.35rem' }}>{formatKg(confirmed.qtyKg)} • {formatRupees(confirmed.total)}</div>
          </div>
          <Link to={`/b/${confirmed.batchId}`} className="btn btn-primary btn-full">{t('backToBatchBtn')}</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="container-narrow">
      <div style={{ marginBottom: '1.25rem' }}><h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t('orderSummaryTitle')}</h1><div style={{ backgroundColor: '#FEF9E7', border: '1px solid #E6B94D', color: '#8A5D00', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, display: 'inline-block' }}>{t('demoPaymentNotice')}</div></div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}><div style={{ fontSize: '0.85rem', color: '#556677' }}>{t('unitLabel')}</div><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{state.unitName}</div><div style={{ fontSize: '0.9rem', color: '#556677' }}>{state.fishType} ({state.batchId})</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.95rem' }}>
          {[
            [t('buyerName'), `${state.buyerName} (${state.phone})`, true], [t('qtyOrdered'), formatKg(qty), true],
            [t('pricePerKg'), formatRupees(price), false], [t('subtotal'), formatRupees(total), true, 'var(--line)'],
            [t('platformFee'), `- ${formatRupees(fee)}`, false, null, 'var(--laterite)']
          ].map(([lbl, val, bold, topBorder, col], i) => (<div key={i} className="flex-between" style={{ borderTop: topBorder ? `1px solid ${topBorder}` : 'none', paddingTop: topBorder ? '0.5rem' : 0, color: col }}><span style={{ color: col || '#556677' }}>{lbl}</span><span style={{ fontWeight: bold ? 600 : 400 }}>{val}</span></div>))}
          <div className="flex-between" style={{ borderTop: '2px solid var(--line)', paddingTop: '0.65rem', fontSize: '1.15rem', fontWeight: 800 }}><span>{t('netSellerPayout')}</span><span style={{ color: 'var(--seaweed)' }}>{formatRupees(sellerGets)}</span></div>
        </div>
      </div>
      <button type="button" className="btn btn-accent btn-full" onClick={handleConfirm} disabled={busy} style={{ minHeight: 52, fontSize: '1.05rem', boxShadow: 'var(--shadow-card)' }}><Icon name="check" size={20} /><span>{busy ? t('loading') : t('confirmDemoOrderBtn')}</span></button>
    </div>
  );
}