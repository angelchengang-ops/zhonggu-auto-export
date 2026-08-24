const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET = 'test-only-secret';
delete process.env.NETLIFY;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
globalThis.__ZHONGGU_CRM_MEMORY__ = { leads: [], settings: null };

const { handler } = require('../netlify/functions/inquiries');
const { buildStats, readLeads } = require('../netlify/functions/crm-store');

const event = (body, secret = '') => ({ httpMethod: 'POST', path: '/api/inquiries', headers: { 'content-type': 'application/json', 'x-zhonggu-synthetic-secret': secret }, body: JSON.stringify(body) });
const valid = { name: '[AUTO TEST] Daily Inquiry Check', country: 'Automation Test', whatsapp: '0000000000', vehicle: '[AUTO TEST]', is_test: true, test_type: 'daily_morning_check', test_id: 'AUTO-TEST-20260824' };

test('forged public synthetic flag is rejected', async () => {
  const response = await handler(event(valid));
  assert.equal(response.statusCode, 403);
});

test('synthetic lead is idempotent, unassigned, suppresses external actions, and is excluded from stats', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return { ok: true, status: 200 }; };
  const first = await handler(event(valid, 'test-only-secret'));
  const second = await handler(event(valid, 'test-only-secret'));
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  const firstBody = JSON.parse(first.body);
  const secondBody = JSON.parse(second.body);
  assert.equal(firstBody.lead.is_test, true);
  assert.equal(firstBody.lead.assignedTo, '');
  assert.equal(firstBody.results.externalActionsSuppressed, true);
  assert.equal(secondBody.results.duplicate, true);
  const { items } = await readLeads();
  assert.equal(items.filter((item) => item.test_id === valid.test_id).length, 1);
  assert.equal(buildStats(items).total, 0);
  assert.equal(buildStats(items).synthetic.total, 1);
  assert.equal(fetchCalls, 0);
});

test('ordinary inquiry keeps the normal workflow', async () => {
  let fetchCalls = 0;
  process.env.ZHONGGU_LEAD_WEBHOOK_URL = 'https://example.invalid/hook';
  global.fetch = async () => { fetchCalls += 1; return { ok: true, status: 200 }; };
  const response = await handler(event({ name: 'Real Customer', country: 'Ghana', whatsapp: '233000000000', vehicle: 'SUV' }));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).lead.is_test, false);
  assert.equal(fetchCalls, 1);
  const { items } = await readLeads();
  assert.equal(buildStats(items).total, 1);
});
