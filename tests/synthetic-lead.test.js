const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET = 'test-only-secret';
process.env.ZHONGGU_ADMIN_PASSWORD = 'test-only-admin-secret';
delete process.env.NETLIFY;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
globalThis.__ZHONGGU_CRM_MEMORY__ = { leads: [], settings: null };

const { handler } = require('../netlify/functions/inquiries');
const { createSessionCookie } = require('../netlify/functions/admin-session');
const { buildStats, filterLeads, readLeads } = require('../netlify/functions/crm-store');

const event = (body, secret = '', cookie = '') => ({ httpMethod: 'POST', path: '/api/inquiries', headers: { 'content-type': 'application/json', 'x-zhonggu-synthetic-secret': secret, cookie }, body: JSON.stringify(body) });
const valid = { name: '[AUTO TEST] Daily Inquiry Check', country: 'Automation Test', whatsapp: '0000000000', vehicle: '[AUTO TEST]', is_test: true, test_type: 'daily_morning_check', test_id: 'AUTO-TEST-20260824' };

test('forged public synthetic flag is rejected', async () => {
  const response = await handler(event(valid));
  assert.equal(response.statusCode, 403);
});

test('an authenticated admin browser session may submit one isolated daily test through the normal inquiry handler', async () => {
  const cookie = createSessionCookie().split(';', 1)[0];
  const adminTest = { ...valid, id: 'AUTO-TEST-20260825', test_id: 'AUTO-TEST-20260825' };
  const response = await handler(event(adminTest, '', cookie));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.id, adminTest.test_id);
  assert.equal(body.results.externalActionsSuppressed, true);
  assert.equal(body.results.netlifyFormFallback, false);
  assert.equal(body.results.webhook, false);
});

test('synthetic lead is idempotent, unassigned, suppresses external actions, and is excluded from stats', async () => {
  globalThis.__ZHONGGU_CRM_MEMORY__.leads = [];
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return { ok: true, status: 200 }; };
  const first = await handler(event(valid, 'test-only-secret'));
  const second = await handler(event(valid, 'test-only-secret'));
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  const firstBody = JSON.parse(first.body);
  const secondBody = JSON.parse(second.body);
  assert.equal(firstBody.lead.is_test, true);
  assert.equal(firstBody.lead.id, valid.test_id);
  assert.equal(firstBody.lead.assignedTo, '');
  assert.equal(firstBody.results.externalActionsSuppressed, true);
  assert.equal(secondBody.results.duplicate, true);
  const { items } = await readLeads();
  assert.equal(items.filter((item) => item.test_id === valid.test_id).length, 1);
  assert.equal(filterLeads(items, new URLSearchParams(`is_test=true&test_id=${valid.test_id}`)).length, 1);
  assert.equal(filterLeads(items, new URLSearchParams('is_test=true&test_id=AUTO-TEST-20990101')).length, 0);
  assert.equal(buildStats(items).total, 0);
  assert.equal(buildStats(items).synthetic.total, items.filter((item) => item.is_test).length);
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
