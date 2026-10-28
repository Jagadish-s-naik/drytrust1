// src/data.js - Storage engine, QR encoding, image compression, geo, weather, format & seed
import QRCode from 'qrcode';

export const formatKg = (kg) => `${Number(kg || 0).toLocaleString('en-IN')} kg`;
export const formatRupees = (amt) => `₹${Number(amt || 0).toLocaleString('en-IN')}`;
export function formatDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const s = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return withTime ? `${s}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : s;
}

export const TOWNS = [
  { name: 'Mangaluru', lat: 12.9141, lon: 74.856 }, { name: 'Ullal', lat: 12.8058, lon: 74.858 },
  { name: 'Malpe', lat: 13.3516, lon: 74.7042 }, { name: 'Udupi', lat: 13.3409, lon: 74.7421 },
  { name: 'Kundapura', lat: 13.6276, lon: 74.6934 }, { name: 'Honnavar', lat: 14.2802, lon: 74.4439 },
  { name: 'Karwar', lat: 14.8135, lon: 74.1298 }
];

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export const checkLocationStatus = (pLat, pLon, uLat, uLon, maxKm = 25) => {
  if (pLat == null || pLon == null || uLat == null || uLon == null) return 'unavailable';
  return (calculateDistanceKm(pLat, pLon, uLat, uLon) ?? 999) <= maxKm ? 'near' : 'mismatch';
};

export const hasBatchLocationMismatch = (b, u) => Boolean(b?.photos && u && b.photos.some((p) => p && checkLocationStatus(p.lat, p.lon, u.lat, u.lon) === 'mismatch'));

export async function compressImage(fileOrDataUrl, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null);
    if (typeof fileOrDataUrl === 'string') img.src = fileOrDataUrl;
    else {
      const r = new FileReader();
      r.onload = (e) => { img.src = e.target.result; };
      r.onerror = () => resolve(null);
      r.readAsDataURL(fileOrDataUrl);
    }
  });
}

export function captureFrameFromVideo(video) {
  if (!video) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export async function getRainForecast(lat, lon) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_days=1`);
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();
    const nextProbs = (data.hourly?.precipitation_probability || []).slice(new Date().getHours(), new Date().getHours() + 6);
    const rainHourIndex = nextProbs.findIndex((p) => p >= 40);
    return { rainLikely: rainHourIndex >= 0, nextHours: rainHourIndex >= 0 ? rainHourIndex + 1 : 0 };
  } catch (err) {
    return { rainLikely: false, nextHours: 0, error: err.message };
  }
}

const toB64 = (s) => btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode('0x' + p))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s) => {
  try {
    let b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return decodeURIComponent(Array.from(atob(b), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch { return null; }
};

const FC = { same_day: 'sd', iced_1day: 'i1', older: 'ol' }, RFC = { sd: 'same_day', i1: 'iced_1day', ol: 'older' };
const SC = { none: 'no', light: 'lt', standard: 'st', heavy: 'hv' }, RSC = { no: 'none', lt: 'light', st: 'standard', hv: 'heavy' };
const MC = { open_sun: 'os', solar_tent: 'st', mechanical: 'me' }, RMC = { os: 'open_sun', st: 'solar_tent', me: 'mechanical' };

export function buildQrPayload(b, u) {
  const cl = b.officerCheck?.checklist || b.checklist || {};
  const c = [cl.raisedRack ? '1':'0', cl.covered ? '1':'0', cl.protected ? '1':'0', cl.cleanArea ? '1':'0', cl.sealedPack ? '1':'0'].join('');
  const photos = Array.isArray(b.photos) ? b.photos.filter((p) => p && (p.dataUrl || typeof p === 'string')) : [];
  const ph = photos.length >= 3 ? (photos.every((p) => typeof p === 'object' && p.live) ? 1 : 2) : 0;
  const isVer = Boolean(b.officerCheck || b.verified === true);
  const mv = b.officerCheck?.moisture != null ? b.officerCheck.moisture : b.moisture;
  const mb = b.officerCheck?.moisture != null ? 'officer' : b.moistureBy;
  return toB64(JSON.stringify({
    u: u?.unitName || '', t: u?.town || '', f: b.fishType || '', w: b.weightKg || 0, p: b.pricePerKg || 0,
    s: b.dryingStart || '', c, ph, v: isVer ? 1 : 0, fr: FC[b.freshness] || 'sd', sa: SC[b.salting] || 'st',
    dm: MC[b.dryingMethod] || 'os', pd: b.packedDate || b.dryingStart || '', ub: Number(b.useByMonths) || 3,
    m: mv != null && mv !== '' ? Number(mv) : null, mb: mb === 'officer' ? 'o' : mb === 'seller' ? 's' : 0
  }));
}

export const buildQrUrl = (b, u) => (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}#/b/${b.id}?d=${buildQrPayload(b, u)}`);

export async function generateQrDataUrl(text, size = 240) {
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#12304A', light: '#FFFFFF' } });
  } catch { return null; }
}

export function parseQrPayload(payload) {
  if (!payload) return null;
  const raw = fromB64(payload);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const c = String(d.c || '00000'), ph = Number(d.ph) || 0;
    const photos = ph === 1 ? [{ live: true, dataUrl: '1' }, { live: true, dataUrl: '2' }, { live: true, dataUrl: '3' }]
      : ph === 2 ? [{ live: false, dataUrl: '1' }, { live: false, dataUrl: '2' }, { live: false, dataUrl: '3' }] : [];
    const isVer = d.v === 1, mb = d.mb === 'o' ? 'officer' : d.mb === 's' ? 'seller' : null;
    return {
      batch: {
        id: 'QR-BATCH', fishType: d.f || 'Fish', weightKg: Number(d.w) || 0, pricePerKg: Number(d.p) || 0,
        dryingStart: d.s || new Date().toISOString().split('T')[0], packedDate: d.pd || d.s,
        checklist: { raisedRack: c[0]==='1', covered: c[1]==='1', protected: c[2]==='1', cleanArea: c[3]==='1', sealedPack: c[4]==='1' },
        photos, verified: isVer, freshness: RFC[d.fr] || 'same_day', salting: RSC[d.sa] || 'standard',
        dryingMethod: RMC[d.dm] || 'open_sun', useByMonths: Number(d.ub) || 3, moisture: d.m != null ? Number(d.m) : null,
        moistureBy: mb, officerCheck: isVer ? { moisture: d.m, officerName: 'Fisheries Officer' } : null
      },
      unit: { unitName: d.u || 'Coastal Dry Fish Unit', town: d.t || 'Karnataka Coast' }
    };
  } catch { return null; }
}

export const STORAGE_VERSION = 'v2.0';
export const STORAGE_KEYS = { VERSION: 'dt_version', UNITS: 'dt_units', BATCHES: 'dt_batches', REPORTS: 'dt_reports', ORDERS: 'dt_orders', SESSION: 'dt_session', LANG: 'dt_lang' };

export function safeGet(key, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
export function safeSet(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch {
    window.dispatchEvent(new CustomEvent('dt_toast', { detail: { message: 'Storage full. Remove old batches.', type: 'error' } }));
    return false;
  }
}

const listGet = (k) => safeGet(k, []);
const itemSave = (k, it, unshift = false) => {
  const list = listGet(k), idx = list.findIndex((x) => x.id === it.id);
  if (idx >= 0) list[idx] = it; else if (unshift) list.unshift(it); else list.push(it);
  return safeSet(k, list) ? it : null;
};

export const getUnits = () => listGet(STORAGE_KEYS.UNITS), getUnitById = (id) => getUnits().find((u) => u.id === id) || null, findUnitByPhone = (phone) => getUnits().find((u) => u.phone === phone) || null, saveUnit = (u) => itemSave(STORAGE_KEYS.UNITS, u);
export const getBatches = () => listGet(STORAGE_KEYS.BATCHES), getBatchById = (id) => getBatches().find((b) => b.id === id) || null, saveBatch = (b) => itemSave(STORAGE_KEYS.BATCHES, b, true);
export const getReports = () => listGet(STORAGE_KEYS.REPORTS), getReportsByBatchId = (bid) => getReports().filter((r) => r.batchId === bid), saveReport = (r) => itemSave(STORAGE_KEYS.REPORTS, r, true);
export const getOrders = () => listGet(STORAGE_KEYS.ORDERS), getOrdersByBatchId = (bid) => getOrders().filter((o) => o.batchId === bid), saveOrder = (o) => itemSave(STORAGE_KEYS.ORDERS, o, true);
export const getOrdersByUnitId = (uid) => { const bList = getBatches(); return getOrders().filter((o) => { const b = bList.find((x) => x.id === o.batchId); return b ? b.unitId === uid : o.unitId === uid; }); };
export const updateOrderStatus = (id, status) => { const list = getOrders(), it = list.find((o) => o.id === id); if (it) { it.status = status; it.updatedAt = new Date().toISOString(); safeSet(STORAGE_KEYS.ORDERS, list); } return it; };
export const setOfficerCheck = (id, data) => { const list = getBatches(), b = list.find((x) => x.id === id); if (!b) return null; b.officerCheck = data; b.verified = true; safeSet(STORAGE_KEYS.BATCHES, list); return b; };
export const removeOfficerCheck = (id) => { const list = getBatches(), b = list.find((x) => x.id === id); if (!b) return null; b.officerCheck = null; b.verified = false; safeSet(STORAGE_KEYS.BATCHES, list); return b; };
export const getSession = () => safeGet(STORAGE_KEYS.SESSION, null), setSession = (s) => safeSet(STORAGE_KEYS.SESSION, s), clearSession = () => localStorage.removeItem(STORAGE_KEYS.SESSION);
export const getStoredLang = () => safeGet(STORAGE_KEYS.LANG, 'en') || 'en', setStoredLang = (l) => safeSet(STORAGE_KEYS.LANG, l);

export function generateBatchId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = 'DT-';
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

const makeSvg = (bg, stroke, t1, t2) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="${bg}"/><rect x="20" y="20" width="560" height="360" fill="none" stroke="${stroke}" stroke-width="4"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="%2312304A">${t1}</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${stroke}">${t2}</text></svg>`;
export const SAMPLE_PHOTO_DRYING = makeSvg('%23E8DFCF', '%2312304A', 'PHOTO 1: Raised Drying Rack', 'Clean bamboo platform elevated 1m');
export const SAMPLE_PHOTO_NET = makeSvg('%23E0EBE5', '%232D6A4F', 'PHOTO 2: Food-Grade Cover / Mesh', 'Tarp & mesh secured against flies and crows');
export const SAMPLE_PHOTO_PACKED = makeSvg('%23E6ECF2', '%23D99A1E', 'PHOTO 3: Sealed Moisture-Proof Pack', 'Airtight packaging with batch label');

const dAgo = (d, h = 0) => new Date(Date.now() - (d * 24 + h) * 36e5).toISOString();
const dateOnly = (d) => dAgo(d).split('T')[0];

export function generateSeedData() {
  const units = [
    { id: 'UNIT-MLP-01', unitName: 'Mogaveera Mahila Sangha', ownerName: 'Radhika Mogaveera', phone: '9845012345', town: 'Malpe', lat: 13.3516, lon: 74.7042, pin: '1234', createdAt: dAgo(25) },
    { id: 'UNIT-HNV-02', unitName: 'Coastal Catch Dried Foods', ownerName: 'Sunita Kharvi', phone: '9845012346', town: 'Honnavar', lat: 14.2802, lon: 74.4439, pin: '1234', createdAt: dAgo(22) },
    { id: 'UNIT-MNG-03', unitName: 'Netravati Fisherwomen Co-op', ownerName: 'Devaki Salian', phone: '9845012347', town: 'Mangaluru', lat: 12.9141, lon: 74.856, pin: '1234', createdAt: dAgo(20) },
    { id: 'UNIT-KRW-04', unitName: 'Karwar Sun Dried Crafts', ownerName: 'Jayanti Harikantra', phone: '9845012348', town: 'Karwar', lat: 14.8135, lon: 74.1298, pin: '1234', createdAt: dAgo(18) }
  ];
  const pLive = (lat, lon, d, h) => [{ dataUrl: SAMPLE_PHOTO_DRYING, at: dAgo(d, h), lat, lon, live: true }, { dataUrl: SAMPLE_PHOTO_NET, at: dAgo(d, h - 1), lat, lon, live: true }, { dataUrl: SAMPLE_PHOTO_PACKED, at: dAgo(d, h - 2), lat, lon, live: true }];
  const clAll = { raisedRack: true, covered: true, protected: true, cleanArea: true, sealedPack: true };
  const mkB = (id, unitId, fishType, weightKg, pricePerKg, dStart, dEnd, checklist, photos, verified, freshness, salting, dryingMethod, useByMonths, moisture, moistureBy, officerCheck) => ({
    id, unitId, fishType, weightKg, pricePerKg, dryingStart: dateOnly(dStart), packedDate: dateOnly(dEnd), checklist, photos, verified, freshness, salting, dryingMethod, useByMonths, moisture, moistureBy, officerCheck, createdAt: dAgo(dEnd)
  });
  const batches = [
    mkB('DT-4K9ZXQ', 'UNIT-MLP-01', 'Mackerel', 85, 340, 18, 14, clAll, pLive(13.352, 74.705, 18, 4), true, 'same_day', 'standard', 'solar_tent', 6, 13.5, 'officer', { checklist: clAll, moisture: 13.5, visitedAt: dAgo(13, 2), officerName: 'P. Rao (Fisheries Dept)', note: 'Solar tent in pristine condition.' }),
    mkB('DT-8B2LMV', 'UNIT-MLP-01', 'Anchovy', 120, 280, 10, 8, clAll, pLive(13.351, 74.704, 10, 5), true, 'same_day', 'standard', 'mechanical', 6, 12.0, 'officer', { checklist: clAll, moisture: 12.0, visitedAt: dAgo(7, 3), officerName: 'P. Rao (Fisheries Dept)', note: 'Rapid mechanical drying.' }),
    mkB('DT-3J7TRW', 'UNIT-HNV-02', 'Prawn', 45, 650, 7, 4, clAll, pLive(14.281, 74.444, 7, 3), true, 'same_day', 'standard', 'solar_tent', 6, 14.0, 'officer', { checklist: clAll, moisture: 14.0, visitedAt: dAgo(3, 4), officerName: 'A. Naik (Inspector)', note: 'Clean shrimp processing.' }),
    mkB('DT-5N1CPK', 'UNIT-HNV-02', 'Sardine', 150, 220, 12, 9, clAll, pLive(14.28, 74.443, 12, 6), false, 'iced_1day', 'standard', 'solar_tent', 3, 14.8, 'seller', null),
    mkB('DT-9X3DWE', 'UNIT-MNG-03', 'Bombil', 95, 310, 15, 11, clAll, pLive(12.915, 74.857, 15, 2), false, 'same_day', 'standard', 'open_sun', 3, 15.0, 'seller', null),
    mkB('DT-6Y4HQS', 'UNIT-MNG-03', 'Anchovy', 60, 290, 5, 3, { ...clAll, sealedPack: false }, pLive(12.914, 74.856, 5, 4), false, 'same_day', 'light', 'open_sun', 3, null, null, null),
    mkB('DT-2R8KLP', 'UNIT-KRW-04', 'Mackerel', 110, 320, 21, 17, { ...clAll, protected: false }, pLive(14.814, 74.13, 21, 5), false, 'iced_1day', 'heavy', 'open_sun', 3, 17.5, 'seller', null),
    mkB('DT-7F9MNA', 'UNIT-KRW-04', 'Sole Fish', 40, 400, 14, 8, { raisedRack: false, covered: false, protected: false, cleanArea: false, sealedPack: false }, [{ dataUrl: SAMPLE_PHOTO_DRYING, at: dAgo(14), lat: 14.813, lon: 74.129, live: false }, { dataUrl: SAMPLE_PHOTO_NET, at: dAgo(14), lat: 14.813, lon: 74.129, live: false }], false, 'older', 'none', 'open_sun', 1, null, null, null),
    mkB('DT-1W5TXZ', 'UNIT-MLP-01', 'Ribbon Fish', 75, 260, 16, 10, { raisedRack: true, covered: false, protected: false, cleanArea: false, sealedPack: true }, [{ dataUrl: SAMPLE_PHOTO_DRYING, at: dAgo(16), lat: 12.914, lon: 74.856, live: true }], false, 'older', 'light', 'open_sun', 1, 21.0, 'seller', null)
  ];
  const reports = [
    { id: 'REP-01', batchId: 'DT-1W5TXZ', reason: 'excess_moisture', note: 'Fish was damp and had off odor.', createdAt: dAgo(6) },
    { id: 'REP-02', batchId: 'DT-7F9MNA', reason: 'sand_contamination', note: 'Sand particles detected on fish.', createdAt: dAgo(4) }
  ];
  const orders = [
    { id: 'ORD-101', batchId: 'DT-4K9ZXQ', unitId: 'UNIT-MLP-01', buyerName: 'Karthik Shenoy', phone: '9845112233', qtyKg: 5, pricePerKg: 340, total: 1700, platformFee: 102, sellerGets: 1598, status: 'Confirmed (demo)', createdAt: dAgo(2) },
    { id: 'ORD-102', batchId: 'DT-8B2LMV', unitId: 'UNIT-MLP-01', buyerName: 'Shweta Pai', phone: '9845223344', qtyKg: 10, pricePerKg: 280, total: 2800, platformFee: 168, sellerGets: 2632, status: 'Confirmed (demo)', createdAt: dAgo(1) },
    { id: 'ORD-103', batchId: 'DT-5N1CPK', unitId: 'UNIT-HNV-02', buyerName: 'Anand Prabhu', phone: '9845334455', qtyKg: 8, pricePerKg: 220, total: 1760, platformFee: 106, sellerGets: 1654, status: 'Confirmed (demo)', createdAt: dAgo(0, 5) }
  ];
  return { units, batches, reports, orders };
}

export function resetDemoData() {
  const d = generateSeedData();
  safeSet(STORAGE_KEYS.VERSION, STORAGE_VERSION);
  for (const [k, v] of [[STORAGE_KEYS.UNITS, d.units], [STORAGE_KEYS.BATCHES, d.batches], [STORAGE_KEYS.REPORTS, d.reports], [STORAGE_KEYS.ORDERS, d.orders]]) safeSet(k, v);
  return d;
}

export function initSeedDataIfEmpty() {
  if (typeof window !== 'undefined' && window.localStorage && (safeGet(STORAGE_KEYS.VERSION) !== STORAGE_VERSION || !getUnits().length)) resetDemoData();
}