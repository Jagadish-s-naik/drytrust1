// src/pages/Seller.jsx - Unified seller portal (Auth login/register & Dashboard with rain alert, tips, batches, orders)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Seal, BandChip, EmptyState, Modal } from '../ui.jsx';
import { TOWNS, saveUnit, findUnitByPhone, getUnitById, getBatches, getReports, getOrdersByUnitId, updateOrderStatus, getRainForecast, formatDate, formatRupees, formatKg } from '../data.js';
import { batchScore, bandOf, claimOf, unitScore, nextLevelTips } from '../score.js';
import { useApp } from '../ctx.jsx';

function SellerAuth() {
  const { t, loginSeller } = useApp();
  const [tab, setTab] = useState('login');
  const [login, setLogin] = useState({ phone: '', pin: '', err: '' }), [reg, setReg] = useState({ unitName: '', ownerName: '', phone: '', town: '', pin: '' });
  const [regErrors, setRegErrors] = useState({});

  const setL = (k, v) => setLogin((p) => ({ ...p, [k]: v }));
  const setR = (k, v) => { setReg((p) => ({ ...p, [k]: v })); setRegErrors((p) => ({ ...p, [k]: null })); };

  const handleLogin = (e) => {
    e.preventDefault(); setL('err', '');
    const p = login.phone.trim(), pin = login.pin.trim();
    if (!p || !pin) return setL('err', t('errInvalidCreds'));
    const unit = findUnitByPhone(p);
    if (!unit || unit.pin !== pin) return setL('err', t('errInvalidCreds'));
    loginSeller(unit.id);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const errs = {};
    if (!reg.unitName.trim()) errs.unitName = t('errUnitNameReq');
    if (!reg.ownerName.trim()) errs.ownerName = t('errOwnerNameReq');
    if (!/^[6-9]\d{9}$/.test(reg.phone.trim())) errs.phone = t('errPhoneInvalid');
    else if (findUnitByPhone(reg.phone.trim())) errs.phone = t('errPhoneExists');
    if (!reg.town) errs.town = t('errTownReq');
    if (!/^\d{4}$/.test(reg.pin.trim())) errs.pin = t('errPinInvalid');
    if (Object.keys(errs).length) return setRegErrors(errs);

    const tw = TOWNS.find((x) => x.name === reg.town) || TOWNS[0];
    const newUnit = {
      id: `UNIT-${tw.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      unitName: reg.unitName.trim(), ownerName: reg.ownerName.trim(), phone: reg.phone.trim(),
      town: tw.name, lat: tw.lat, lon: tw.lon, pin: reg.pin.trim(), createdAt: new Date().toISOString()
    };
    saveUnit(newUnit); loginSeller(newUnit.id);
  };

  return (
    <div className="container-narrow">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}><h1 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{t('seller')}</h1><p style={{ color: '#556677', fontSize: '0.95rem' }}>{tab === 'login' ? 'Access your unit batch records' : 'Register your processing unit'}</p></div>
      <div className="grid-2" style={{ backgroundColor: 'var(--bone)', padding: 4, borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--line)' }}>
        <button type="button" onClick={() => { setTab('login'); setL('err', ''); }} className="btn" style={{ minHeight: 44, backgroundColor: tab === 'login' ? 'var(--paper)' : 'transparent', color: 'var(--ink)', borderColor: tab === 'login' ? 'var(--line)' : 'transparent', fontWeight: 700 }}>{t('loginTab')}</button>
        <button type="button" onClick={() => { setTab('register'); setRegErrors({}); }} className="btn" style={{ minHeight: 44, backgroundColor: tab === 'register' ? 'var(--paper)' : 'transparent', color: 'var(--ink)', borderColor: tab === 'register' ? 'var(--line)' : 'transparent', fontWeight: 700 }}>{t('registerTab')}</button>
      </div>

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="card" noValidate>
          {login.err && <div style={{ backgroundColor: '#FDE8E4', color: 'var(--laterite)', border: '1px solid #F4A290', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>{login.err}</div>}
          <div className="form-group"><label className="form-label" htmlFor="login-phone">{t('phoneLabel')}</label><input id="login-phone" type="tel" className="form-input" value={login.phone} onChange={(e) => setL('phone', e.target.value)} placeholder={t('phonePlaceholder')} maxLength={10} required /></div>
          <div className="form-group"><label className="form-label" htmlFor="login-pin">{t('pinLabel')}</label><input id="login-pin" type="password" className="form-input" value={login.pin} onChange={(e) => setL('pin', e.target.value)} placeholder={t('pinPlaceholder')} maxLength={4} required /><span className="form-helper">Demo PIN for seeded accounts: 1234</span></div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>{t('loginBtn')}</button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="card" noValidate>
          {[
            { id: 'unitName', label: t('unitNameLabel'), placeholder: t('unitNamePlaceholder'), type: 'text' },
            { id: 'ownerName', label: t('ownerNameLabel'), placeholder: t('ownerNamePlaceholder'), type: 'text' },
            { id: 'phone', label: t('phoneLabel'), placeholder: t('phonePlaceholder'), type: 'tel', max: 10 },
            { id: 'town', label: t('townLabel'), type: 'select', opts: TOWNS },
            { id: 'pin', label: t('pinLabel'), placeholder: t('pinPlaceholder'), type: 'password', max: 4, help: 'Choose any 4-digit PIN for hackathon demo' }
          ].map((f) => (
            <div key={f.id} className="form-group">
              <label className="form-label" htmlFor={`reg-${f.id}`}>{f.label}</label>
              {f.type === 'select' ? (<select id={`reg-${f.id}`} className="form-select" value={reg[f.id]} onChange={(e) => setR(f.id, e.target.value)} required><option value="">{t('selectTown')}</option>{f.opts.map((tw) => <option key={tw.name} value={tw.name}>{tw.name}</option>)}</select>) : (<input id={`reg-${f.id}`} type={f.type} className="form-input" value={reg[f.id]} onChange={(e) => setR(f.id, e.target.value)} placeholder={f.placeholder} maxLength={f.max} required />)}
              {regErrors[f.id] && <div className="form-error">{regErrors[f.id]}</div>}
              {f.help && <span className="form-helper">{f.help}</span>}
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.75rem' }}>{t('registerBtn')}</button>
        </form>
      )}
    </div>
  );
}

export default function Seller() {
  const { session, logout, t, showToast } = useApp();
  const [unit, setUnit] = useState(null), [batches, setBatches] = useState([]), [reports, setReports] = useState([]), [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [weather, setWeather] = useState({ loading: true, rainLikely: false, nextHours: 0, error: null });
  const isSeller = session?.role === 'seller' && session?.unitId;

  useEffect(() => {
    if (!isSeller) return;
    const u = getUnitById(session.unitId);
    if (!u) { logout(); return; }
    setUnit(u); setBatches(getBatches().filter((b) => b.unitId === u.id));
    setReports(getReports()); setOrders(getOrdersByUnitId(u.id));
    let active = true;
    getRainForecast(u.lat, u.lon).then((res) => { if (active) setWeather({ loading: false, ...res }); });
    return () => { active = false; };
  }, [isSeller, session, logout]);

  if (!isSeller) return <SellerAuth />;
  if (!unit) return null;

  const avgScore = unitScore(unit.id, batches, reports), latestBatch = batches[0] || null;
  const latestScore = latestBatch ? batchScore(latestBatch, reports.filter((r) => r.batchId === latestBatch.id)) : null;
  const isGold = latestScore !== null && latestScore >= 80;
  const tips = latestBatch && !isGold ? nextLevelTips(latestBatch, reports.filter((r) => r.batchId === latestBatch.id)) : [];

  const handleStatusUpdate = (orderId, newStatus) => {
    const updated = updateOrderStatus(orderId, newStatus);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      showToast(t('orderUpdatedToast'), 'success');
    }
  };

  const getStatusBadge = (s = 'Pending') => {
    if (s.includes('Packing')) return { label: t('orderStatusPacking'), bg: '#EBF4FF', color: '#1E40AF', border: '#BFDBFE' };
    if (s === 'Dispatched') return { label: t('orderStatusDispatched'), bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' };
    if (s.includes('Delivered') || s.includes('Completed')) return { label: t('orderStatusCompleted'), bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
    if (s === 'Declined') return { label: t('orderStatusDeclined'), bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
    return { label: t('orderStatusPending'), bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
  };

  return (
    <div className="container-narrow">
      <div className="card flex-between" style={{ gap: '1rem', marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#556677', fontWeight: 700 }}>{t('welcomeUnit')} • {unit.town}</span>
          <h2 style={{ fontSize: '1.35rem', marginTop: '0.15rem', color: 'var(--ink)' }}>{unit.unitName}</h2>
          <p style={{ fontSize: '0.85rem', color: '#556677', marginTop: '0.2rem' }}>{unit.ownerName} • {unit.phone}</p>
        </div>
        <Seal score={avgScore} size="md" />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: weather.rainLikely ? '5px solid var(--laterite)' : '5px solid var(--seaweed)', backgroundColor: weather.rainLikely ? '#FDF5F2' : 'var(--paper)', display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '1rem 1.15rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', backgroundColor: weather.rainLikely ? '#F8D7DA' : '#E8F3ED', color: weather.rainLikely ? 'var(--laterite)' : 'var(--seaweed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="rain" size={20} color={weather.rainLikely ? 'var(--laterite)' : 'var(--seaweed)'} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>{t('weatherCardTitle')}</h4>
          {weather.loading ? <p style={{ fontSize: '0.875rem', color: '#556677' }}>{t('loading')}</p> : weather.error ? <p style={{ fontSize: '0.875rem', color: '#556677' }}>{t('weatherFallback')}</p> : weather.rainLikely ? <p style={{ fontSize: '0.9rem', color: 'var(--laterite)', fontWeight: 600 }}>{t('rainAlertLikely', { hours: weather.nextHours })}</p> : <p style={{ fontSize: '0.9rem', color: 'var(--seaweed)', fontWeight: 500 }}>{t('rainAlertClear')}</p>}
        </div>
      </div>

      <Link to="/seller/batch/new" className="btn btn-accent btn-full" style={{ minHeight: 52, fontSize: '1.05rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)' }}><Icon name="check" size={20} /><span>{t('newBatchBtn')}</span></Link>

      {latestBatch && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}><Icon name="stamp" size={18} color="var(--turmeric)" /><h3 style={{ fontSize: '1.1rem' }}>{t('nextLevelTitle')}</h3></div>
          {isGold ? (<div style={{ backgroundColor: '#FEF3D6', border: '1px solid #E6B94D', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', color: '#8A5D00', fontSize: '0.9rem', fontWeight: 600 }}>{t('goldCongrats')}</div>) : tips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{tips.map((tip) => (<div key={tip.key} className="flex-between" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bone)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{tip.label}</span><span style={{ color: 'var(--seaweed)', fontWeight: 700 }}>+{tip.points} pts → {tip.targetBand}</span></div>))}</div>
          ) : <p style={{ color: '#556677', fontSize: '0.9rem' }}>No further improvements needed.</p>}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}><h3>{t('yourBatchesTitle')}</h3><span style={{ fontSize: '0.85rem', color: '#556677' }}>{batches.length} total</span></div>
        {batches.length === 0 ? (
          <EmptyState icon="raisedRack" title={t('emptyBatchesTitle')} description={t('emptyBatchesDesc')} action={<Link to="/seller/batch/new" className="btn btn-primary" style={{ minHeight: 44 }}>{t('newBatchBtn')}</Link>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {batches.map((b) => {
              const score = batchScore(b, reports.filter((r) => r.batchId === b.id));
              return (
                <Link key={b.id} to={`/b/${b.id}/result`} className="card flex-between" style={{ textDecoration: 'none', gap: '0.75rem', padding: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{b.id}</span><BandChip band={bandOf(score)} claim={claimOf(b)} /></div>
                    <div style={{ fontSize: '0.875rem', color: '#556677' }}><strong>{b.fishType}</strong> • {formatKg(b.weightKg)} • {formatDate(b.dryingStart)}</div>
                  </div>
                  <Seal score={score} verified={b.verified || Boolean(b.officerCheck)} size="sm" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}><h3>{t('buyerOrdersTitle')}</h3><span style={{ fontSize: '0.85rem', color: '#556677' }}>{orders.length} orders</span></div>
        {orders.length === 0 ? (<p style={{ color: '#556677', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>{t('noOrdersYet')}</p>) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map((ord) => {
              const badge = getStatusBadge(ord.status);
              return (
                <div key={ord.id} className="card" onClick={() => setSelectedOrder(ord)} style={{ padding: '0.9rem 1rem', cursor: 'pointer', border: '1px solid var(--line)' }}>
                  <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <div><span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '1rem' }}>{ord.buyerName}</span><div style={{ fontSize: '0.8rem', color: '#556677', fontFamily: 'monospace' }}>{ord.id}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: 'var(--seaweed)' }}>{formatRupees(ord.sellerGets)}</div><span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '1px 6px', borderRadius: 'var(--radius-sm)', marginTop: 2 }}>{badge.label}</span></div>
                  </div>
                  <div className="flex-between" style={{ fontSize: '0.85rem', color: '#556677', borderTop: '1px solid var(--line)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                    <span>{formatKg(ord.qtyKg)} • {ord.phone}</span><span style={{ color: 'var(--turmeric)', fontWeight: 600 }}>Manage ›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title={selectedOrder ? `${selectedOrder.id} — ${selectedOrder.buyerName}` : ''}>
        {selectedOrder && (() => {
          const badge = getStatusBadge(selectedOrder.status), st = selectedOrder.status || 'Pending';
          return (
            <div>
              <div className="flex-between" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--line)' }}>
                <div><div style={{ fontSize: '0.8rem', color: '#556677' }}>Order Status</div><span style={{ display: 'inline-block', fontSize: '0.85rem', fontWeight: 700, backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginTop: 3 }}>{badge.label}</span></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.8rem', color: '#556677' }}>Date Placed</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatDate(selectedOrder.createdAt, true)}</div></div>
              </div>
              <div style={{ backgroundColor: 'var(--bone)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Buyer Contact & Logistics</div>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.65rem' }}><strong>{selectedOrder.buyerName}</strong> • {selectedOrder.phone}</div>
                <div className="grid-2" style={{ gap: '0.5rem' }}>
                  <a href={`tel:${selectedOrder.phone}`} className="btn btn-secondary" style={{ minHeight: 40, fontSize: '0.85rem', textDecoration: 'none' }}>📞 {t('actionCallBuyer')}</a>
                  <a href={`https://wa.me/91${selectedOrder.phone}?text=Hello%20${encodeURIComponent(selectedOrder.buyerName)},%20this%20is%20${encodeURIComponent(unit.unitName)}%20regarding%20your%20DryTrust%20order%20${selectedOrder.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ minHeight: 40, fontSize: '0.85rem', textDecoration: 'none', color: '#15803D' }}>💬 {t('actionWhatsappBuyer')}</a>
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--paper)', border: '1px solid var(--line)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                {[
                  ['Batch / Fish:', selectedOrder.batchId, true], ['Quantity:', formatKg(selectedOrder.qtyKg), true],
                  ['Order Subtotal:', formatRupees(selectedOrder.total), false], ['Platform Fee (6%):', `- ${formatRupees(selectedOrder.platformFee)}`, false, 'var(--laterite)']
                ].map(([label, val, bold, col], i) => (<div key={i} className="flex-between" style={{ marginBottom: '0.35rem', color: col }}><span style={{ color: col || '#556677' }}>{label}</span><span style={{ fontWeight: bold ? 600 : 400 }}>{val}</span></div>))}
                <div className="flex-between" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: 'var(--seaweed)' }}><span>Net Payout to You:</span><span>{formatRupees(selectedOrder.sellerGets)}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(st === 'Confirmed (demo)' || st === 'Pending Acceptance' || st === 'Pending') && (
                  <>
                    <button type="button" className="btn btn-primary btn-full" onClick={() => handleStatusUpdate(selectedOrder.id, 'Packing in Progress')}>✓ {t('actionAcceptOrder')}</button>
                    <button type="button" className="btn btn-danger btn-full" style={{ backgroundColor: 'transparent', color: 'var(--laterite)', borderColor: 'var(--laterite)' }} onClick={() => handleStatusUpdate(selectedOrder.id, 'Declined')}>✕ {t('actionDeclineOrder')}</button>
                  </>
                )}
                {st === 'Packing in Progress' && <button type="button" className="btn btn-accent btn-full" onClick={() => handleStatusUpdate(selectedOrder.id, 'Dispatched')}>📦 {t('actionDispatchOrder')}</button>}
                {st === 'Dispatched' && <button type="button" className="btn btn-primary btn-full" onClick={() => handleStatusUpdate(selectedOrder.id, 'Delivered & Completed')}>🎉 {t('actionCompleteOrder')}</button>}
                {(st === 'Delivered & Completed' || st === 'Declined') && <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#556677', fontStyle: 'italic' }}>No further actions needed for this order.</p>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}