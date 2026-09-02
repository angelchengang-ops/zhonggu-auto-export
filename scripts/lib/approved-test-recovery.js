// User-approved on 2026-09-03. No caller-supplied IDs or fuzzy matching.
const crypto = require('node:crypto');
const BATCH = 'legacy-test-isolation-20260903';
const TARGETS = Object.freeze([
  Object.freeze({ id: 'NF-6a8fa138bd480f6fcad7a8ac', day: '2026-08-27', marker: 'AUTO-TEST-20260827', testId: 'AUTO-TEST-20260827-RECOVERED-1', type: 'daily_morning_check_recovered_duplicate', submissionId: '6a8fa138bd480f6fcad7a8ac' }),
  Object.freeze({ id: 'AUTO-TEST-20260821', day: '2026-08-21', marker: 'AUTO-TEST-20260821', testId: 'AUTO-TEST-20260821', type: 'daily_morning_check', submissionId: '' })
]);
const clean = value => String(value ?? '').trim();
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const checksFor = (item, target) => ({
  exactId: item?.id === target.id,
  fixedName: item?.name === '[AUTO TEST] Daily Inquiry Check',
  fixedCountry: item?.country === 'Automation Test',
  fixedNumber: /^0{8,10}$/.test(clean(item?.rawWhatsapp || item?.whatsapp).replace(/^\+/, '').replace(/\s/g, '')),
  testModel: [item?.vehicle, item?.interestedModel].some(value => clean(value) === '[AUTO TEST]'),
  originalDate: clean(item?.createdAt || item?.created_at).startsWith(target.day),
  exactMarker: item?.id === target.marker || clean(item?.message).includes(target.marker),
  originalSubmission: !target.submissionId || item?.sourceSubmissionId === target.submissionId,
  unassigned: ['', 'unassigned', '未分配'].includes(clean(item?.assignedTo)),
  noConflictingIsolation: !item?.is_test || (item.test_id === target.testId && item.test_type === target.type)
});
const matches = (item, target) => Object.values(checksFor(item, target)).every(Boolean);
const registered = (registry, target) => registry?.batch === BATCH
  && registry?.entries?.[target.id]?.testId === target.testId;
const applyIsolation = (item, registry) => {
  const target = TARGETS.find(target => target.id === item.id);
  if (!target || !registered(registry, target) || !matches(item, target)) return item;
  return { ...item, is_test: true, test_id: target.testId, test_type: target.type };
};
const planRecovery = (items, registry = {}) => {
  if (!Array.isArray(items)) throw new Error('Recovery requires an array of original records');
  const candidates = TARGETS.map(target => items.filter(item => item?.id === target.id));
  const records = TARGETS.map((target, index) => {
    const list = candidates[index], item = list[0];
    const checks = { exactlyOneRecord: list.length === 1, ...checksFor(item, target) };
    const applied = registered(registry, target) && Object.values(checks).every(Boolean);
    return { id: target.id, createdAt: item?.createdAt || item?.created_at || '',
      storedIsTest: item?.is_test === true, storedTestId: item?.test_id || '',
      sourceSubmissionMatches: checks.originalSubmission,
      checks, eligible: Object.values(checks).every(Boolean), applied,
      effectiveIsTest: applyIsolation(item || {}, registry).is_test === true,
      targetTestId: target.testId };
  });
  return { batch: BATCH, records, eligible: records.every(item => item.eligible),
    complete: records.every(item => item.applied),
    appliedAt: registry.appliedAt || '',
    fingerprint: digest({ candidates, registry }), leadCollectionWritten: false };
};
const makeRegistry = (plan, current = {}) => ({
  ...current, batch: BATCH, approvedOn: '2026-09-03', appliedAt: new Date().toISOString(), appliedBy: 'authenticated_admin',
  preflightFingerprint: plan.fingerprint,
  entries: Object.fromEntries(TARGETS.map(target => [target.id, { testId: target.testId, type: target.type }]))
});
module.exports = { BATCH, TARGETS, checksFor, applyIsolation, planRecovery, makeRegistry };
