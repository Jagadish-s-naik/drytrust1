// src/pages/Trace.jsx - Public trace page: timeline, chain integrity, ice basis, stages
import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../ctx.jsx';
import { getBatchById, getHandoversByBatch, getPartyById, getDisputes } from '../data.js';
import { verifyChain, stageHours, decodePayload } from '../chain.js';
import { Icon, Empty } from '../ui.jsx';

function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function IceChip({ iceIn, t }) {
  return (
    <span className="chip chip-ice" style={{ fontSize: '0.78rem' }}>
      <Icon name="ice" size={12} />{iceIn ? t('iceIncl') : t('iceExcl')}
    </span>
  );
}

export default function Trace() {
  const { batchId } = useParams();
  const [params] = useSearchParams();
  const { t } = useApp();

  let batch = getBatchById(batchId);
  let chain = batch ? getHandoversByBatch(batchId) : [];
  let names = {};

  if (!batch) {
    const payload = decodePayload(params.get('d'));
    if (payload) { batch = payload.batch; chain = payload.chain || []; names = payload.names || {}; }
  } else {
    getHandoversByBatch(batchId).forEach((h) => {
      [h.fromId, h.toId].forEach((id) => { if (!names[id]) { const p = getPartyById(id); if (p) names[id] = p.name; } });
    });
  }

  if (!batch) {
    return (
      <div className="container-narrow" style={{ paddingTop: '2rem' }}>
        <Empty icon="alert" title={t('notFound')} desc={t('notFoundDesc')}
          action={<Link to="/" className="btn btn-secondary">{t('goHome')}</Link>} />
      </div>
    );
  }

  const { ok, brokenAt } = verifyChain(chain);
  const stages = stageHours(batch, chain);
  const totalStage = stages.find((s) => s.key === 'total');
  const disputes = getDisputes().filter((d) => d.batchId === batchId || chain.some((h) => h.id === d.handoverId));

  return (
    <div className="container-narrow">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>{t('traceTitle')}: {batch.id}</h2>
        <p style={{ color: '#556677', fontSize: '0.9rem' }}>{batch.species} · {batch.harbour} · {batch.kg} kg</p>
        <p style={{ fontSize: '0.85rem', color: '#556677' }}>{t('landedAt')}: {fmtDate(batch.landedAt)}</p>
        {totalStage && <p style={{ fontSize: '0.85rem', color: '#556677' }}>{t('hoursAtStage', { h: totalStage.hours })} from landing to latest handover</p>}
      </div>

      <div className={`card row`} style={{ marginBottom: '1.25rem', borderLeft: `5px solid ${ok ? 'var(--seaweed)' : 'var(--laterite)'}`, gap: '0.75rem' }}>
        <Icon name={ok ? 'check' : 'alert'} size={22} color={ok ? 'var(--seaweed)' : 'var(--laterite)'} />
        <div>
          <span style={{ fontWeight: 700, color: ok ? 'var(--seaweed)' : 'var(--laterite)' }}>
            {ok ? t('chainIntact') : t('chainAltered', { n: brokenAt })}
          </span>
        </div>
      </div>

      {chain.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#556677' }}>No handovers recorded yet.</div>
      )}

      <h3 style={{ marginBottom: '0.85rem' }}>{t('handoverTimeline')}</h3>
      <div>
        {chain.map((h) => {
          const fromName = names[h.fromId] || h.fromId;
          const toName = names[h.toId] || h.toId;
          const hoDisputes = disputes.filter((d) => d.handoverId === h.id);
          const hasDisp = hoDisputes.length > 0;
          const transitStage = stages.find((s) => s.key === `transit_${h.seq}`);
          const holdStage = stages.find((s) => s.key === `hold_${h.seq}`);
          return (
            <div key={h.id} className="timeline-item">
              <div className={`timeline-dot ${hasDisp ? 'timeline-dot-dispute' : ''}`}>
                <Icon name={hasDisp ? 'alert' : 'dispatch'} size={18} color={hasDisp ? 'var(--laterite)' : 'var(--ink)'} />
              </div>
              <div style={{ flex: 1, paddingTop: '0.1rem' }}>
                <div className="row" style={{ flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700 }}>{fromName} → {toName}</span>
                  {hasDisp && <span className="chip chip-dispute">{t('disputeBadge')}</span>}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#556677' }}>
                  {t('kgToSend')}: {h.kgSent} kg {h.kgReceived != null ? `→ ${h.kgReceived} kg` : ''}
                  {' '}· ₹{h.price}/kg {h.priceAgreed != null ? `→ ₹${h.priceAgreed}/kg` : ''}
                </p>
                <div className="row" style={{ gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <IceChip iceIn={h.iceIn} t={t} />
                  {h.iceInRecv != null && <IceChip iceIn={h.iceInRecv} t={t} />}
                  {hoDisputes.length > 0 && (
                    <span className={`chip ${hoDisputes[0].iceAgreed ? 'chip-paid' : 'chip-dispute'}`} style={{ fontSize: '0.78rem' }}>
                      {hoDisputes[0].iceAgreed ? t('iceAgreed') : t('iceNotAgreed')}
                    </span>
                  )}
                </div>
                {transitStage && (
                  <p style={{ fontSize: '0.8rem', color: '#889aa0', marginTop: '0.25rem' }}>
                    ⏱ {t('hoursAtStage', { h: transitStage.hours })} {t('billTo').toLowerCase()}
                  </p>
                )}
                {holdStage && (
                  <p style={{ fontSize: '0.8rem', color: '#889aa0' }}>
                    🏠 {t('hoursAtStage', { h: holdStage.hours })} held
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
