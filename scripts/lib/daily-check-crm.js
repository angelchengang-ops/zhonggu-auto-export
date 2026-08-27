'use strict';

const CRM_AUTH_EXPIRED = 'CRM_AUTH_EXPIRED';

const exactTestMatches = (items = [], testId = '') => items.filter((item) =>
  item && item.is_test === true && String(item.test_id || '') === String(testId || '')
);

const decideCrmRun = ({ authStatus, queryStatus, items = [], testId = '' } = {}) => {
  if (Number(authStatus) === 401) return { status: 'blocked', code: CRM_AUTH_EXPIRED, writeAllowed: false, action: 'open_local_chrome_login' };
  if (Number(authStatus) !== 200) return { status: 'unavailable', code: 'CRM_AUTH_UNAVAILABLE', writeAllowed: false, action: 'record_and_stop_crm_writes' };
  if (Number(queryStatus) !== 200) return { status: 'unavailable', code: 'CRM_DUPLICATE_CHECK_UNAVAILABLE', writeAllowed: false, action: 'record_and_stop_crm_writes' };
  const matches = exactTestMatches(items, testId);
  if (matches.length > 1) return { status: 'failed', code: 'CRM_DUPLICATE_TEST_RECORDS', writeAllowed: false, action: 'record_duplicate_anomaly', matches };
  if (matches.length === 1) return { status: 'skipped_existing', code: 'CRM_TEST_ALREADY_EXISTS', writeAllowed: false, action: 'verify_existing', matches };
  return { status: 'success', code: 'CRM_DUPLICATE_CHECK_CLEAR', writeAllowed: true, action: 'eligible_for_single_synthetic_submission', matches: [] };
};

module.exports = { CRM_AUTH_EXPIRED, decideCrmRun, exactTestMatches };
