// src/score.js - Scoring configuration and pure calculation functions for DryTrust
export const HYGIENE_WEIGHTS = { raisedRack: 25, covered: 15, protected: 15, cleanArea: 15, sealedPack: 15, photosLive: 15, photosGallery: 8, photosMissing: 0 };
export const QUALITY_WEIGHTS = {
  freshness: { same_day: 20, iced_1day: 12, older: 0 },
  salting: { none: 5, light: 12, standard: 15, heavy: 10 },
  dryingDays: { optimal: 20, suboptimal: 8 },
  dryingDaysRange: { Anchovy: [2, 3], Bombil: [3, 5], Mackerel: [3, 5], Sardine: [3, 4], Prawn: [2, 4], Other: [2, 6] },
  dryingMethod: { open_sun: 5, solar_tent: 13, mechanical: 15 },
  moisture: { LIMIT: 15, officerMax: 30, officerNear: 15, officerOver: 0, sellerMax: 15, sellerNear: 7.5, sellerOver: 0 }
};
export const OVERALL_WEIGHTS = {
  hygieneShare: 0.6, qualityShare: 0.4, reportPenalty: 5, verificationBonus: 10,
  caps: { missingPhotosMax: 49, unverifiedMax: 79 }, bands: { gold: 80, silver: 50 }
};

export function calculateDryingDays(startStr, packedStr) {
  if (!startStr) return 1;
  const s = new Date(startStr), e = packedStr ? new Date(packedStr) : new Date();
  return isNaN(s) || isNaN(e) ? 1 : Math.max(1, Math.round((e - s) / 864e5));
}

export function hygieneScore(b) {
  if (!b) return 0;
  const cl = b.officerCheck?.checklist || b.checklist || {};
  let pts = (cl.raisedRack ? 25 : 0) + (cl.covered ? 15 : 0) + (cl.protected ? 15 : 0) + (cl.cleanArea ? 15 : 0) + (cl.sealedPack ? 15 : 0);
  const photos = Array.isArray(b.photos) ? b.photos.filter((p) => p && (p.dataUrl || typeof p === 'string')) : [];
  if (photos.length >= 3) pts += photos.every((p) => typeof p === 'object' && p.live) ? 15 : 8;
  return Math.max(0, Math.min(100, pts));
}

export function qualityScore(b) {
  if (!b) return 0;
  let pts = (QUALITY_WEIGHTS.freshness[b.freshness] ?? 0) + (QUALITY_WEIGHTS.salting[b.salting] ?? 0);
  const days = calculateDryingDays(b.dryingStart, b.packedDate);
  const range = QUALITY_WEIGHTS.dryingDaysRange[b.fishType] || QUALITY_WEIGHTS.dryingDaysRange.Other;
  pts += (days >= range[0] && days <= range[1]) ? 20 : 8;
  pts += QUALITY_WEIGHTS.dryingMethod[b.dryingMethod] ?? 0;
  const om = b.officerCheck?.moisture;
  const hasOff = om !== undefined && om !== null && om !== '';
  const m = hasOff ? Number(om) : (b.moisture != null && b.moisture !== '' ? Number(b.moisture) : null);
  const by = hasOff ? 'officer' : b.moistureBy;
  if (m != null && !isNaN(m)) {
    const lim = QUALITY_WEIGHTS.moisture.LIMIT;
    if (by === 'officer') pts += m <= lim ? 30 : m <= lim + 5 ? 15 : 0;
    else if (by === 'seller') pts += m <= lim ? 15 : m <= lim + 5 ? 7.5 : 0;
  }
  return Math.max(0, Math.min(100, Math.round(pts)));
}

export function batchScore(b, reports = []) {
  if (!b) return 0;
  const isVer = Boolean(b.officerCheck || b.verified === true);
  let overall = Math.round(0.6 * hygieneScore(b) + 0.4 * qualityScore(b));
  if (isVer) overall += 10;
  overall = Math.max(0, Math.min(100, overall) - (Array.isArray(reports) ? reports.length : 0) * 5);
  const photos = Array.isArray(b.photos) ? b.photos.filter((p) => p && (p.dataUrl || typeof p === 'string')) : [];
  if (photos.length < 3) overall = Math.min(overall, 49);
  if (!isVer) overall = Math.min(overall, 79);
  return Math.max(0, Math.min(100, overall));
}

export function bandOf(score) {
  return (typeof score !== 'number' || isNaN(score)) ? 'Needs improvement' : score >= 80 ? 'Gold' : score >= 50 ? 'Silver' : 'Needs improvement';
}

export function claimOf(b) {
  return (b?.officerCheck || b?.verified === true) ? 'Verified' : 'Self-declared';
}

export function unitScore(unitId, injectedBatches = null, injectedReports = null) {
  if (!unitId) return null;
  let batches = injectedBatches, reports = injectedReports;
  if (!batches && typeof window !== 'undefined' && window.localStorage) {
    try { batches = JSON.parse(localStorage.getItem('dt_batches') || '[]'); } catch { batches = []; }
  }
  if (!reports && typeof window !== 'undefined' && window.localStorage) {
    try { reports = JSON.parse(localStorage.getItem('dt_reports') || '[]'); } catch { reports = []; }
  }
  if (!Array.isArray(batches)) return null;
  const list = batches.filter((b) => b.unitId === unitId).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  if (!list.length) return null;
  const rep = Array.isArray(reports) ? reports : [];
  return Math.round(list.reduce((sum, b) => sum + batchScore(b, rep.filter((r) => r.batchId === b.id)), 0) / list.length);
}

export function nextLevelTips(b, reports = []) {
  if (!b) return [];
  const isVer = Boolean(b.officerCheck || b.verified === true);
  const cl = b.officerCheck?.checklist || b.checklist || {};
  const photos = Array.isArray(b.photos) ? b.photos.filter((p) => p && (p.dataUrl || typeof p === 'string')) : [];
  const allLive = photos.length >= 3 && photos.every((p) => typeof p === 'object' && p.live);
  const tips = [];
  const add = (key, points, label, patch) => {
    const pot = batchScore({ ...b, ...patch }, reports);
    tips.push({ key, points, label, potentialScore: pot, targetBand: bandOf(pot) });
  };
  if (!isVer) add('verify', 10, 'Get verified by a field officer: +10 and unlocks Gold', { verified: true, officerCheck: { checklist: cl } });
  if (photos.length < 3 || !allLive) add('photos', photos.length < 3 ? 15 : 7, 'Take all 3 photos live at drying unit', { photos: [{ dataUrl: '1', live: true }, { dataUrl: '2', live: true }, { dataUrl: '3', live: true }] });
  if (b.moisture == null && !b.officerCheck?.moisture) add('moisture', isVer ? 30 : 15, 'Add a moisture reading (under 15%)', { moisture: 14, moistureBy: isVer ? 'officer' : 'seller' });
  if (b.freshness !== 'same_day') add('freshness', b.freshness === 'iced_1day' ? 8 : 20, 'Dry same day as landing', { freshness: 'same_day' });
  const hygiene = [['raisedRack', 25, 'Use a raised drying rack'], ['covered', 15, 'Cover with clean mesh/tarp'], ['protected', 15, 'Protect from flies and animals'], ['cleanArea', 15, 'Keep drying perimeter clean'], ['sealedPack', 15, 'Pack in moisture-proof sealed bags']];
  for (const [k, pts, label] of hygiene) if (!cl[k]) add(k, pts, label, { checklist: { ...cl, [k]: true } });
  if (b.dryingMethod === 'open_sun') add('dryingMethod', 8, 'Upgrade to a solar tent dryer', { dryingMethod: 'solar_tent' });
  return tips.sort((a, b) => b.points - a.points);
}
