'use strict';
const FIELDS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const url = value => {
  try { const parsed = new URL(clean(value, 4096)); return /^https?:$/.test(parsed.protocol) ? (parsed.origin + parsed.pathname).slice(0, 2048) : ''; } catch { return ''; }
};
const normalizeTouch = input => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const landing = url(input.landing_page);
  const time = typeof input.captured_at === 'string' ? Date.parse(input.captured_at) : NaN;
  if (!landing || !Number.isFinite(time)) return null;
  const result = { landing_page: landing, referrer: url(input.referrer), captured_at: new Date(time).toISOString() };
  for (const key of FIELDS) result[key] = clean(input[key], key.startsWith('utm_') ? 512 : 256);
  return result;
};
const normalizeAttribution = input => {
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { return null; } }
  if (!input || input.schema_version !== 1) return null;
  const first = normalizeTouch(input.first_touch);
  if (!first) return null;
  return { schema_version: 1, first_touch: first, first_ad_touch: normalizeTouch(input.first_ad_touch), last_touch: normalizeTouch(input.last_touch) || first };
};
module.exports = { normalizeAttribution };
