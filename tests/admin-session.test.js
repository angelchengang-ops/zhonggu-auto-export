const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ZHONGGU_ADMIN_PASSWORD = 'test-only-admin-secret';

const { MAX_AGE_SECONDS, createSessionCookie, handler, requireAdmin } = require('../netlify/functions/admin-session');

test('missing CRM session returns a non-sensitive auth-expired response with writes disabled', async () => {
  const response = await handler({ headers: {} });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 401);
  assert.equal(body.code, 'CRM_AUTH_EXPIRED');
  assert.equal(body.reauthenticationRequired, true);
  assert.equal(body.writeAllowed, false);
  assert.equal(body.sessionMaxAgeSeconds, 12 * 60 * 60);
});

test('a valid CRM session cookie passes authentication', () => {
  const cookieHeader = createSessionCookie().split(';', 1)[0];
  const result = requireAdmin({ headers: { cookie: cookieHeader } });
  assert.equal(result.username, 'admin');
  assert.equal(MAX_AGE_SECONDS, 12 * 60 * 60);
});
