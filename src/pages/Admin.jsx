// src/pages/Admin.jsx - Admin login & operations center (stats, unit batches, inspection & officer audit)
import React, { useState, useEffect } from 'react';
import { Icon, Seal, BandChip, ScoreBars, Modal } from '../ui.jsx';
import { getUnits, getBatches, getReports, setOfficerCheck, removeOfficerCheck, resetDemoData, formatDate, formatKg, hasBatchLocationMismatch } from '../data.js';
import { batchScore, bandOf, unitScore, hygieneScore, qualityScore, claimOf } from '../score.js';
import { useApp } from '../ctx.jsx';

const CH_ITEMS = [['raisedRack', 'checkRaisedRack'], ['covered', 'checkCovered'], ['protected', 'checkProtected'], ['cleanArea', 'checkCleanArea'], ['sealedPack', 'checkSealedPack']];
const BtnChoice = ({ active, color, bg, label, onClick }) => (
  <button type="button" onClick={onClick} style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: active ? `2px solid ${color}` : '1px solid var(--line)', backgroundColor: active ? bg : '#fff', color: active ? color : 'var(--ink)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>{label}</button>
);

export default function Admin() {
  const { session, loginAdmin, logout, t, showToast } = useApp(), isAdmin = session?.role === 'admin';
  const [pass, setPass] = useState(''), [loginErr, setLoginErr] = useState('');
  const [units, setUnits] = useState([]), [batches, setBatches] = useState([]), [reports, setReports] = useState([]);
  const [search, setSearch] = useState(''), [bandFilter, setBandFilter] = useState('ALL');
  const [selUnit, setSelUnit] = useState(null), [inspectBatch, setInspectBatch] = useState(null), [resetModal, setResetModal] = useState(false);

  const [officerForm, setOfficerForm] = useState({ officerName: 'Suresh Kumar (Fisheries Inspector)', visitedAt: new Date().toISOString().split('T')[0], moisture: '', note: '', checklist: { raisedRack: true, covered: true, protected: true, cleanArea: true, sealedPack: true } });
  const setO = (k, v) => setOfficerForm((p) => ({ ...p, [k]: v }));
  const setOCl = (k, v) => setOfficerForm((p) => ({ ...p, checklist: { ...p.checklist, [k]: v } }));

  const loadData = () => { setUnits(getUnits()); setBatches(getBatches()); setReports(getReports()); };
  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  useEffect(() => {
    if (inspectBatch) {
      const cl = inspectBatch.officerCheck?.checklist || inspectBatch.checklist || {};
      setOfficerForm({
        officerName: inspectBatch.officerCheck?.officerName || 'Suresh Kumar (Fisheries Inspector)',
        visitedAt: inspectBatch.officerCheck?.visitedAt ? inspectBatch.officerCheck.visitedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        moisture: inspectBatch.officerCheck?.moisture != null ? inspectBatch.officerCheck.moisture : (inspectBatch.moisture != null ? inspectBatch.moisture : ''),
        note: inspectBatch.officerCheck?.note || '',
        checklist: { raisedRack: cl.raisedRack === true, covered: cl.covered === true, protected: cl.protected === true, cleanArea: cl.cleanArea === true, sealedPack: cl.sealedPack === true }
      });
    }
  }, [inspectBatch]);

  const handleLogin = (e) => { e.preventDefault(); if (pass === 'admin123') loginAdmin(); else setLoginErr(t('errAdminPassInvalid')); };

  const handleSaveAudit = (e) => {
    e.preventDefault(); if (!inspectBatch) return;
    const updated = setOfficerCheck(inspectBatch.id, {
      officerName: officerForm.officerName.trim() || 'Fisheries Field Officer', visitedAt: new Date(officerForm.visitedAt).toISOString(),
      moisture: officerForm.moisture !== '' && !isNaN(parseFloat(officerForm.moisture)) ? parseFloat(officerForm.moisture) : null,
      note: officerForm.note.trim(), checklist: { ...officerForm.checklist }
    });
    if (updated) { setBatches((p) => p.map((b) => (b.id === updated.id ? updated : b))); setInspectBatch(updated); showToast(t('officerCheckSavedToast'), 'success'); }
  };

  const handleRemoveAudit = () => {
    if (!inspectBatch) return;
    const updated = removeOfficerCheck(inspectBatch.id);
    if (updated) { setBatches((p) => p.map((b) => (b.id === updated.id ? updated : b))); setInspectBatch(updated); showToast(t('verificationRemovedToast'), 'info'); }
  };

  const handleReset = () => { resetDemoData(); loadData(); setSelUnit(null); setInspectBatch(null); setResetModal(false); showToast(t('resetSuccessToast'), 'info'); };

  if (!isAdmin) {
    return (
      <div className="container-narrow">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'var(--seaweed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}><Icon name="stamp" size={26} color="#fff" /></div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t('adminLoginTitle')}</h1>
          <p style={{ color: '#556677', fontSize: '0.9rem' }}>{t('adminSubtitle')}</p>
        </div>
        <form onSubmit={handleLogin} className="card" noValidate>
          {loginErr && <div style={{ backgroundColor: '#FDE8E4', color: 'var(--laterite)', border: '1px solid #F4A290', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>{loginErr}</div>}
          <div className="form-group"><label className="form-label" htmlFor="admin-pass">{t('adminPasswordLabel')}</label><input id="admin-pass" type="password" className="form-input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t('adminPasswordPlaceholder')} required /><span className="form-helper">Demo password: admin123</span></div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>{t('loginBtn')}</button>
        </form>
      </div>
    );
  }

  const verifiedCount = batches.filter((b) => b.officerCheck || b.verified).length, selfDeclaredCount = batches.filter((b) => !b.officerCheck && !b.verified).length;
  const moistureCount = batches.filter((b) => b.moisture != null || b.officerCheck?.moisture != null).length, mismatchCount = batches.filter((b) => hasBatchLocationMismatch(b, units.find((u) => u.id === b.unitId))).length;
  const filteredUnits = units
    .filter((u) => { const q = search.toLowerCase(); return u.unitName.toLowerCase().includes(q) || u.ownerName.toLowerCase().includes(q) || u.town.toLowerCase().includes(q); })
    .map((u) => { const uBatches = batches.filter((b) => b.unitId === u.id), score = unitScore(u.id, batches, reports); return { ...u, score, band: score != null ? bandOf(score) : null, batchCount: uBatches.length }; })
    .filter((u) => bandFilter === 'ALL' || u.band === bandFilter);
  const selBatches = selUnit ? batches.filter((b) => b.unitId === selUnit.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
        <div><span style={{ fontSize: '0.8rem', color: '#556677', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('navOfficerPortal')}</span><h1 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>{t('officerDashboardTitle')}</h1></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setResetModal(true)} style={{ minHeight: 38, padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}><Icon name="refresh" size={16} /><span>{t('resetDemoBtn')}</span></button>
          <button type="button" className="btn btn-secondary" onClick={logout} style={{ minHeight: 38, padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}><Icon name="logout" size={16} /><span>{t('logoutBtn')}</span></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { l: t('counterTotalUnits'), v: units.length }, { l: t('counterTotalBatches'), v: batches.length },
          { l: t('counterVerifiedBatches'), v: verifiedCount, bg: '#E8F3ED', bc: '#A3D4BC', c: 'var(--seaweed)' },
          { l: t('counterSelfDeclared'), v: selfDeclaredCount, bg: '#FEF3C7', bc: '#FCD34D', c: '#92400E' },
          { l: t('counterWithMoisture'), v: moistureCount },
          { l: t('counterLocationMismatches'), v: mismatchCount, bg: mismatchCount > 0 ? '#FDE8E4' : '#fff', bc: mismatchCount > 0 ? 'var(--laterite)' : 'var(--line)', c: mismatchCount > 0 ? 'var(--laterite)' : 'var(--ink)' }
        ].map((c, i) => (<div key={i} className="card" style={{ padding: '0.85rem', backgroundColor: c.bg || '#fff', borderColor: c.bc || 'var(--line)' }}><span style={{ fontSize: '0.75rem', color: c.c || '#556677', fontWeight: c.c ? 600 : 400 }}>{c.l}</span><div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.c || 'var(--ink)' }}>{c.v}</div></div>))}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t('adminDashboardTitle')}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input type="text" className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchUnitsPlaceholder')} style={{ width: 180, height: 38 }} />
            <select className="form-select" value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} style={{ width: 140, height: 38 }}><option value="ALL">{t('filterBandAll')}</option><option value="Gold">{t('bandGold')}</option><option value="Silver">{t('bandSilver')}</option><option value="Needs improvement">{t('bandNeedsImprovement')}</option></select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr style={{ borderBottom: '2px solid var(--line)' }}>{['tableUnitOperator', 'tableTown', 'tableBatches', 'tableTrustSeal', 'tableAction'].map((th) => <th key={th}>{t(th)}</th>)}</tr></thead>
            <tbody>
              {filteredUnits.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.unitName}</strong><div style={{ fontSize: '0.8rem', color: '#556677' }}>{u.ownerName} • {u.phone}</div></td><td>{u.town}</td><td>{u.batchCount}</td>
                  <td>{u.score != null ? <BandChip band={u.band} /> : <span style={{ color: '#556677' }}>{t('noBatches')}</span>}</td>
                  <td><button type="button" className="btn btn-secondary" onClick={() => setSelUnit(u)} style={{ minHeight: 34, padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>{t('btnViewBatches')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selUnit && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bone)' }}>
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <div><h3 style={{ fontSize: '1.15rem', margin: 0 }}>{t('batchesForUnit', { name: selUnit.unitName })}</h3><p style={{ fontSize: '0.8rem', color: '#556677', margin: 0 }}>{selUnit.town} • {selUnit.ownerName}</p></div>
            <button type="button" className="btn btn-secondary" onClick={() => setSelUnit(null)} style={{ minHeight: 32, fontSize: '0.75rem' }}>{t('btnClose')}</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr>{['thBatchId', 'thFish', 'thWeight', 'thScore', 'thStatus', 'thAction'].map((th) => <th key={th}>{t(th)}</th>)}</tr></thead>
              <tbody>
                {selBatches.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.id}</td><td>{b.fishType}</td><td>{formatKg(b.weightKg)}</td>
                    <td><BandChip band={bandOf(batchScore(b, reports.filter((r) => r.batchId === b.id)))} claim={claimOf(b)} /></td>
                    <td>{b.officerCheck ? <span style={{ color: 'var(--seaweed)', fontWeight: 700 }}>✓ {t('claimVerified')}</span> : <span style={{ color: '#92400E' }}>{t('claimSelfDeclared')}</span>}</td>
                    <td><button type="button" className="btn btn-primary" onClick={() => setInspectBatch(b)} style={{ minHeight: 32, padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>{t('btnInspectAudit')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={Boolean(inspectBatch)} onClose={() => setInspectBatch(null)} title={inspectBatch ? `Inspect & Audit Batch ${inspectBatch.id}` : ''}>
        {inspectBatch && (() => {
          const currentOverall = batchScore(inspectBatch, reports.filter((r) => r.batchId === inspectBatch.id));
          const H = hygieneScore(inspectBatch), Q = qualityScore(inspectBatch), isVer = Boolean(inspectBatch.officerCheck || inspectBatch.verified);
          const sCl = inspectBatch.checklist || {}, auditCl = inspectBatch.officerCheck?.checklist;

          return (
            <div>
              <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
                <div><h3 style={{ fontSize: '1.2rem', margin: '0 0 0.2rem 0' }}>{inspectBatch.fishType} ({inspectBatch.weightKg} kg)</h3><div style={{ fontSize: '0.85rem', color: '#556677' }}>Drying: {formatDate(inspectBatch.dryingStart)} • Packed: {formatDate(inspectBatch.packedDate || inspectBatch.dryingStart)}</div></div>
                <Seal score={currentOverall} verified={isVer} size="sm" />
              </div>
              <ScoreBars hygiene={H} quality={Q} />
              {isVer ? (
                <div style={{ backgroundColor: '#E8F3ED', border: '1px solid #A3D4BC', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: 'var(--seaweed)' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="check" size={16} color="var(--seaweed)" /><span>{t('verifiedByOfficerOn', { name: inspectBatch.officerCheck?.officerName || 'Fisheries Officer' })}</span></div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{t('auditedOnDate', { date: formatDate(inspectBatch.officerCheck?.visitedAt || new Date()) })}</div>
                  {inspectBatch.officerCheck?.note && <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.4rem', color: '#1B3B54' }}>"{inspectBatch.officerCheck.note}"</div>}
                  <button type="button" className="btn btn-secondary btn-full" onClick={handleRemoveAudit} style={{ marginTop: '0.75rem', minHeight: 38, color: 'var(--laterite)', borderColor: 'var(--laterite)' }}>{t('btnRemoveVerification')}</button>
                </div>
              ) : (
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400E' }}>{t('statusUnverifiedDesc')}</div>
              )}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>{t('compareSectionTitle')}</h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                  <table className="table" style={{ fontSize: '0.8rem' }}>
                    <thead><tr style={{ backgroundColor: 'var(--bone)' }}><th>{t('thCriterion')}</th><th>{t('thSellerClaim')}</th><th>{t('thOfficerAudit')}</th></tr></thead>
                    <tbody>
                      {CH_ITEMS.map(([k, l]) => {
                        const sVal = sCl[k] === true, oVal = auditCl ? auditCl[k] === true : officerForm.checklist[k] === true, isDiff = sVal !== oVal;
                        return (<tr key={k} style={{ backgroundColor: isDiff ? '#FDE8E4' : 'transparent' }}><td style={{ fontWeight: 600 }}>{t(l)}</td><td style={{ color: sVal ? 'var(--seaweed)' : 'var(--laterite)' }}>{sVal ? t('yes') : t('no')}</td><td style={{ fontWeight: 700, color: oVal ? 'var(--seaweed)' : 'var(--laterite)' }}>{oVal ? t('yes') : t('no')}{isDiff && ' ⚠️ (Diff)'}</td></tr>);
                      })}
                      <tr style={{ backgroundColor: (inspectBatch.moisture !== (auditCl ? inspectBatch.officerCheck?.moisture : officerForm.moisture)) ? '#FEF9E7' : 'transparent' }}>
                        <td style={{ fontWeight: 600 }}>{t('moistureLabel')}</td><td>{inspectBatch.moisture != null ? `${inspectBatch.moisture}% (${t('sellerTestedMoisture')})` : t('notMeasured')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--seaweed)' }}>{auditCl ? (inspectBatch.officerCheck?.moisture != null ? `${inspectBatch.officerCheck.moisture}% (${t('officerVerifiedMoisture')})` : t('notTested')) : (officerForm.moisture ? `${officerForm.moisture}% (${t('officerVerifiedMoisture')})` : t('notTested'))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {!isVer && (
                <form onSubmit={handleSaveAudit} style={{ borderTop: '2px solid var(--line)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>{t('recordOfficerAuditTitle')}</h4>
                  <div className="form-group"><label className="form-label">{t('officerNameLabel')}</label><input type="text" className="form-input" value={officerForm.officerName} onChange={(e) => setO('officerName', e.target.value)} required /></div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">{t('inspectionDateLabel')}</label><input type="date" className="form-input" value={officerForm.visitedAt} onChange={(e) => setO('visitedAt', e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">{t('testedMoistureLabel')}</label><input type="number" step="0.1" min="5" max="40" className="form-input" placeholder="e.g. 14.0" value={officerForm.moisture} onChange={(e) => setO('moisture', e.target.value)} /></div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.4rem' }}>{t('officerChecklistLabel')}</label>
                    {CH_ITEMS.map(([k, l]) => (
                      <div key={k} className="flex-between" style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--line)', fontSize: '0.85rem' }}>
                        <span>{t(l)}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <BtnChoice active={officerForm.checklist[k] === true} color="var(--seaweed)" bg="#E8F3ED" label={t('yes')} onClick={() => setOCl(k, true)} />
                          <BtnChoice active={officerForm.checklist[k] === false} color="var(--laterite)" bg="#FDE8E4" label={t('no')} onClick={() => setOCl(k, false)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-group"><label className="form-label">{t('officerNoteLabel')}</label><textarea className="form-textarea" rows={2} placeholder="e.g. Rack hygiene compliant, salting uniform, certified for Gold seal." value={officerForm.note} onChange={(e) => setO('note', e.target.value)} /></div>
                  <button type="submit" className="btn btn-primary btn-full" style={{ minHeight: 46 }}><Icon name="check" size={18} /><span>{t('btnSaveAndVerify')}</span></button>
                </form>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={resetModal} onClose={() => setResetModal(false)} title={t('resetModalTitle')}>
        <p style={{ fontSize: '0.9rem', color: '#556677', lineHeight: 1.5 }}>{t('resetModalOfficerDesc')}</p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setResetModal(false)} style={{ flex: 1 }}>{t('cancel')}</button>
          <button type="button" className="btn btn-danger" onClick={handleReset} style={{ flex: 1 }}>{t('btnConfirmReset')}</button>
        </div>
      </Modal>
    </div>
  );
}