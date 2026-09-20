(function (window, document) {
  'use strict';
  if (window.ZhongguTracking) return;
  const ATTR_KEY = 'zg_attribution_v1';
  const SENT_KEY = 'zg_lead_events_v1';
  const TTL = 90 * 24 * 60 * 60 * 1000;
  const fields = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const testMode = new URLSearchParams(window.location.search).has('daily_test_id');
  const config = window.ZhongguTrackingConfig || {};
  const opened = new WeakSet();
  const memory = {};
  let lastWrite = 0;
  const read = key => {
    const candidates = [memory[key]];
    for (const name of ['localStorage', 'sessionStorage']) {
      try { const raw = window[name].getItem(key); if (raw) candidates.push(JSON.parse(raw)); } catch (_) { /* Storage may be unavailable. */ }
    }
    // A quota-full localStorage can still return stale values. Use the newest
    // successful copy, including this page's memory, instead of masking fallback.
    const latest = candidates.filter(item => item && Number.isFinite(item.written_at) && item.value)
      .sort((a, b) => b.written_at - a.written_at)[0];
    if (!latest) return null;
    lastWrite = Math.max(lastWrite, latest.written_at);
    return latest.value;
  };
  const write = (key, value) => {
    const record = { written_at: lastWrite = Math.max(Date.now(), lastWrite + 1), value };
    memory[key] = record;
    for (const name of ['localStorage', 'sessionStorage']) {
      try { window[name].setItem(key, JSON.stringify(record)); } catch (_) { /* Never block an inquiry. */ }
    }
  };
  const pageUrl = value => {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? (url.origin + url.pathname).slice(0, 2048) : ''; } catch (_) { return ''; }
  };
  const hasCampaign = touch => fields.some(key => touch && touch[key]);
  const touch = () => {
    const params = new URLSearchParams(window.location.search);
    const result = { landing_page: pageUrl(window.location.href), referrer: pageUrl(document.referrer), captured_at: new Date().toISOString() };
    fields.forEach(key => { result[key] = (params.get(key) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, key.startsWith('utm_') ? 512 : 256); });
    return result;
  };
  const validTouch = value => value && typeof value === 'object' && Number.isFinite(Date.parse(value.captured_at));
  let attribution = null;
  if (!testMode) {
    const now = Date.now();
    const current = touch();
    const saved = read(ATTR_KEY);
    const valid = saved && saved.schema_version === 1 && validTouch(saved.first_touch) && validTouch(saved.last_touch)
      && Number.isFinite(saved.expires_at) && saved.expires_at > now && saved.expires_at <= now + TTL;
    attribution = valid ? saved : { schema_version: 1, expires_at: now + TTL, first_touch: current, first_ad_touch: null, last_touch: current };
    if (hasCampaign(current) && !hasCampaign(attribution.first_ad_touch)) attribution.first_ad_touch = current;
    // Internal navigation and direct return visits never erase a known campaign.
    const external = current.referrer && new URL(current.referrer).origin !== window.location.origin;
    if (hasCampaign(current) && fields.some(key => current[key] !== attribution.last_touch[key])) attribution.last_touch = current;
    else if (!hasCampaign(current) && external) attribution.last_touch = current;
    write(ATTR_KEY, attribution);
  }
  window.dataLayer = window.dataLayer || [];
  const push = event => { try { window.dataLayer.push(event); return true; } catch (_) { return false; } };
  const gtmEnabled = !testMode && config.enabled === true && /^GTM-[A-Z0-9]+$/.test(config.containerId || '')
    && ['zhongguauto.com', 'www.zhongguauto.com'].includes(window.location.hostname);
  if (gtmEnabled) {
    push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(config.containerId);
    document.head.appendChild(script);
  }
  const openForm = (kind, form) => {
    if (testMode) return;
    if (kind === 'inquiry_form' && form) { if (opened.has(form)) return; opened.add(form); }
    push({ event: kind === 'whatsapp_modal' ? 'whatsapp_lead_open' : 'lead_form_open', lead_channel: kind,
      conversion_role: 'secondary', page_path: window.location.pathname });
  };
  const success = (receipt, kind) => {
    // The receipt is emitted only after the shared server persistence boundary.
    if (testMode || receipt?.stored !== true || receipt?.success !== true || receipt?.ok !== true || !receipt.id
      || receipt.lead?.is_test || receipt.results?.externalActionsSuppressed
      || receipt.conversion?.event !== 'lead_submit_success' || !/^zg-[a-f0-9]{40}$/.test(receipt.conversion.transaction_id || '')) return Promise.resolve(false);
    const id = receipt.conversion.transaction_id;
    const now = Date.now();
    const stored = read(SENT_KEY);
    const sent = Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string' && item.at > now - TTL).slice(-499) : [];
    if (sent.some(item => item.id === id)) return Promise.resolve(false);
    write(SENT_KEY, [...sent, { id, at: now }]);
    return new Promise(resolve => {
      let finished = false;
      let timer;
      const done = () => { if (!finished) { finished = true; window.clearTimeout(timer); resolve(true); } };
      // A bounded callback window lets GTM dispatch before the ordinary redirect.
      // Missing/blocked GTM must never turn a saved inquiry into a failed form.
      if (gtmEnabled) timer = window.setTimeout(done, 1500);
      const delivered = push({ event: 'lead_submit_success', transaction_id: id, lead_channel: kind,
        conversion_role: 'primary', page_path: window.location.pathname,
        ...(gtmEnabled ? { eventCallback: done, eventTimeout: 1500 } : {}) });
      if (!delivered) write(SENT_KEY, sent);
      if (!gtmEnabled || !delivered) done();
    });
  };
  window.ZhongguTracking = {
    getAttribution: () => attribution ? JSON.parse(JSON.stringify(attribution)) : null,
    openForm,
    success
  };
  document.addEventListener('focusin', event => {
    const form = event.target.closest?.('form.inquiry-form');
    if (form) openForm('inquiry_form', form);
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href], .js-inquiry-cta');
    if (!link) return;
    let target;
    try { const url = new URL(link.href || '', window.location.href); if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash) target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (_) { /* Not an in-page link. */ }
    const form = target?.matches('form.inquiry-form') ? target : target?.querySelector('form.inquiry-form');
    if (form) openForm('inquiry_form', form);
  });
})(window, document);
