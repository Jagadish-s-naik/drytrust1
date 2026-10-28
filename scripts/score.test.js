// scripts/score.test.js - Unit tests for score.js & data.js (compact table-driven test suite)
import assert from 'node:assert';
import { hygieneScore, qualityScore, batchScore, bandOf, claimOf, unitScore, nextLevelTips } from '../src/score.js';
import { buildQrPayload, parseQrPayload } from '../src/data.js';

console.log('Running condensed score.test.js...');

const baseBatch = {
  id: 'DT-TEST-01', unitId: 'u1', fishType: 'Mackerel', dryingStart: '2026-10-10', packedDate: '2026-10-14',
  checklist: { raisedRack: true, covered: true, protected: true, cleanArea: true, sealedPack: true },
  photos: [{ dataUrl: 'p1', live: true }, { dataUrl: 'p2', live: true }, { dataUrl: 'p3', live: true }],
  freshness: 'same_day', salting: 'standard', dryingMethod: 'mechanical', moisture: 14, moistureBy: 'seller',
  verified: false, officerCheck: null
};

const verifiedBatch = {
  ...baseBatch, verified: true,
  officerCheck: { checklist: { ...baseBatch.checklist }, moisture: 14, visitedAt: '2026-10-14T10:00:00Z', officerName: 'Suresh Kumar' }
};

const noMoistVer = { ...verifiedBatch, moisture: null, officerCheck: { ...verifiedBatch.officerCheck, moisture: null } };
const zeroBatch = { checklist: {}, photos: [], freshness: 'older', salting: 'none', dryingMethod: 'open_sun', dryingStart: '2026-10-01', packedDate: '2026-10-20' };

const cases = [
  [hygieneScore(baseBatch), 100, 'Best hygiene = 100'],
  [qualityScore(baseBatch), 85, 'Quality with seller moisture = 85'],
  [batchScore(baseBatch, []), 79, 'Unverified best capped at 79'],
  [bandOf(79), 'Silver', '79 is Silver'],
  [claimOf(baseBatch), 'Self-declared', 'Unverified claim'],
  [qualityScore(verifiedBatch), 100, 'Quality with officer moisture = 100'],
  [batchScore(verifiedBatch, []), 100, 'Verified best = 100'],
  [bandOf(100), 'Gold', '100 is Gold'],
  [claimOf(verifiedBatch), 'Verified', 'Verified claim'],
  [qualityScore({ ...baseBatch, moisture: null, moistureBy: null }), 70, 'Q no moisture = 70'],
  [batchScore({ ...baseBatch, moisture: null, moistureBy: null }, []), 79, 'Unverified no moisture = 79'],
  [batchScore(noMoistVer, []), 98, 'Verified no moisture = 98 (Gold)'],
  [bandOf(98), 'Gold', '98 is Gold'],
  [batchScore({ ...verifiedBatch, photos: [{ dataUrl: 'p1', live: true }] }, []), 49, '<3 photos capped at 49'],
  [bandOf(49), 'Needs improvement', '49 is Needs improvement'],
  [hygieneScore({ ...verifiedBatch, photos: [{ dataUrl: '1', live: true }, { dataUrl: '2', live: false }, { dataUrl: '3', live: true }] }), 93, 'Gallery photo gives 8 pts (H=93)'],
  [qualityScore({ fishType: 'Mackerel', dryingStart: '2026-10-10', packedDate: '2026-10-14', moisture: 14, moistureBy: 'officer' }), 50, 'Officer moisture gives 30 pts'],
  [qualityScore({ fishType: 'Mackerel', dryingStart: '2026-10-10', packedDate: '2026-10-14', moisture: 14, moistureBy: 'seller' }), 35, 'Seller moisture gives 15 pts'],
  [batchScore(noMoistVer, [{ id: 'r1' }, { id: 'r2' }]), 88, '2 reports deduct 10 pts'],
  [batchScore(zeroBatch, Array(20).fill({ id: 'r' })), 0, 'Clamped at 0'],
  [batchScore(verifiedBatch, []), 100, 'Clamped at 100'],
  [unitScore('empty', [], []), null, '0 batches = null'],
  [unitScore('u1', [{ ...verifiedBatch, id: 'b1', unitId: 'u1', createdAt: '2026-10-01' }, { ...noMoistVer, id: 'b2', unitId: 'u1', createdAt: '2026-10-02' }, { ...baseBatch, id: 'b3', unitId: 'u1', createdAt: '2026-10-03' }], []), 92, 'Avg 3 batches = 92'],
  [unitScore('u1', [1, 2, 3, 4, 5].map((i) => ({ ...verifiedBatch, id: `b${i}`, unitId: 'u1', createdAt: `2026-10-0${i}` })).concat([{ ...zeroBatch, id: 'b6', unitId: 'u1', createdAt: '2026-09-01' }]), []), 100, 'Last 5 newest averaged']
];

for (const [actual, expected, msg] of cases) assert.strictEqual(actual, expected, msg);

const tips = nextLevelTips({ ...baseBatch, moisture: null, freshness: 'older', checklist: { ...baseBatch.checklist, raisedRack: false } }, []);
assert.ok(tips.length >= 3, '>=3 tips');
for (let i = 0; i < tips.length - 1; i++) assert.ok(tips[i].points >= tips[i + 1].points, 'Tips sorted desc');

const encoded = buildQrPayload(verifiedBatch, { unitName: 'Malpe Fisherwomen Co-op', town: 'Malpe' });
const decoded = parseQrPayload(encoded);
assert.strictEqual(decoded.unit.unitName, 'Malpe Fisherwomen Co-op');
assert.strictEqual(decoded.batch.verified, true);
assert.strictEqual(batchScore(decoded.batch, []), 100, 'Decoded QR batch score is 100');

console.log(`✓ All ${cases.length + 3} test assertions passed perfectly!`);
