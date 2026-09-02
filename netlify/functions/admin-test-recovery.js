const { json, requireAdmin } = require('./admin-session');
const { inspectApprovedTestRecovery, restoreApprovedTestIsolation } = require('./crm-store');
const { BATCH } = require('../../scripts/lib/approved-test-recovery');
const header = (event, name) => Object.entries(event.headers || {}).find(([key]) => key.toLowerCase() === name)?.[1] || '';
exports.handler = async event => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  try {
    if (event.httpMethod === 'GET') return json(200, { ok: true, ...(await inspectApprovedTestRecovery()) });
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'GET or POST required' });
    if (header(event, 'origin') !== 'https://zhongguauto.com'
      || !header(event, 'content-type').startsWith('application/json')) return json(403, { ok: false, error: 'Same-origin JSON confirmation required' });
    const body = JSON.parse(event.body || '{}');
    if (Object.keys(body).some(key => !['batch', 'fingerprint', 'confirm'].includes(key))
      || body.batch !== BATCH || body.confirm !== 'restore-only-approved-two') return json(400, { ok: false, error: 'Only the approved two-record recovery is supported' });
    return json(200, { ok: true, ...(await restoreApprovedTestIsolation(body.fingerprint)) });
  } catch (error) { return json(error.statusCode || 500, { ok: false, error: error.message }); }
};
