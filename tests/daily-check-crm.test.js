const test = require('node:test');
const assert = require('node:assert/strict');

const { CRM_AUTH_EXPIRED, decideCrmRun } = require('../scripts/lib/daily-check-crm');
const { shanghaiStartOfDay } = require('../netlify/functions/crm-store');

const testId = 'AUTO-TEST-20260827';

test('401 blocks every CRM write and requests local Chrome login', () => {
  const result = decideCrmRun({ authStatus: 401, queryStatus: 200, testId });
  assert.equal(result.code, CRM_AUTH_EXPIRED);
  assert.equal(result.writeAllowed, false);
});

test('failed duplicate check blocks submission even with valid authentication', () => {
  assert.equal(decideCrmRun({ authStatus: 200, queryStatus: 503, testId }).writeAllowed, false);
});

test('an exact existing test record is skipped', () => {
  const existing = { id: testId, is_test: true, test_id: testId };
  const result = decideCrmRun({ authStatus: 200, queryStatus: 200, items: [existing], testId });
  assert.equal(result.status, 'skipped_existing');
  assert.equal(result.writeAllowed, false);
});

test('only an authenticated, successful, exact empty check allows one submission', () => {
  assert.equal(decideCrmRun({ authStatus: 200, queryStatus: 200, items: [], testId }).writeAllowed, true);
});

test('multiple exact matches are an anomaly and never writable', () => {
  const duplicate = { id: testId, is_test: true, test_id: testId };
  const result = decideCrmRun({ authStatus: 200, queryStatus: 200, items: [duplicate, { ...duplicate, id: `${testId}-2` }], testId });
  assert.equal(result.status, 'failed');
  assert.equal(result.writeAllowed, false);
});

test('CRM calendar-day boundaries use Asia/Shanghai rather than server UTC', () => {
  assert.equal(shanghaiStartOfDay('2026-08-27T02:00:00.000Z').toISOString(), '2026-08-26T16:00:00.000Z');
  assert.equal(shanghaiStartOfDay('2026-08-27T02:00:00.000Z', 1).toISOString(), '2026-08-27T16:00:00.000Z');
});
