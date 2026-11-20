(() => {
  const copy = {
    en: ['Get a quote', 'Chat on WhatsApp', 'Ask about similar cars', model => `Hello, I’m interested in ${model}. Could you share availability and export pricing?`],
    fr: ['Demander un devis', 'Discuter sur WhatsApp', 'Voir des véhicules similaires', model => `Bonjour, je m’intéresse à ${model}. Pouvez-vous m’indiquer la disponibilité et le prix à l’export ?`],
    ar: ['اطلب عرض سعر', 'تواصل عبر واتساب', 'استفسر عن سيارات مماثلة', model => `مرحباً، أنا مهتم بـ ${model}. هل يمكنكم إرسال معلومات التوفر وسعر التصدير؟`],
    ru: ['Запросить цену', 'Написать в WhatsApp', 'Спросить о похожих авто', model => `Здравствуйте! Меня интересует ${model}. Сообщите, пожалуйста, наличие и цену на экспорт.`],
    es: ['Solicitar cotización', 'Chatear por WhatsApp', 'Consultar por autos similares', model => `Hola, me interesa ${model}. ¿Podrían indicarme la disponibilidad y el precio de exportación?`]
  };
  const chatLinks = document.querySelectorAll('[data-whatsapp-direct]');
  const quoteLinks = document.querySelectorAll('[data-sales-quote]');
  const params = new URLSearchParams(location.search);
  const isolated = params.has('daily_test_id');
  const heading = document.getElementById('detail-title');
  const modelField = document.querySelector('.inquiry-form [name="model"]');
  const localizedCopy = () => copy[document.documentElement.lang.split('-')[0]] || copy.en;
  const modelFor = link => ((heading?.textContent.trim() !== 'Vehicle Detail' && heading?.textContent.trim()) || link.dataset.vehicle || 'Zhonggu Auto Export vehicles');

  function updateChat(link, fromAd = false) {
    const [, label, , message] = localizedCopy();
    const model = modelFor(link);
    link.dataset.vehicle = model;
    if (link.matches('.sales-actions__chat') && link.textContent !== label) link.textContent = label;
    const url = new URL(link.dataset.chatUrl || link.href);
    link.dataset.chatUrl = url.origin + url.pathname;
    url.searchParams.set('text', `${message(model)} [${fromAd ? 'ZG-ADS' : 'ZG-WEB'}]`);
    link.href = isolated ? '#contact' : url.href;
    if (isolated) link.setAttribute('aria-disabled', 'true');
  }

  function refresh() {
    const [quote, , similar] = localizedCopy();
    quoteLinks.forEach(link => { link.textContent = link.hasAttribute('data-sold') ? similar : quote; });
    chatLinks.forEach(link => updateChat(link));
    if (heading && modelField && !modelField.value && heading.textContent.trim() !== 'Vehicle Detail') {
      modelField.value = heading.textContent.trim();
    }
  }

  chatLinks.forEach(link => {
    link.addEventListener('pointerdown', prepare);
    link.addEventListener('focus', prepare);
    link.addEventListener('click', event => {
      // The legacy page handler logs other WhatsApp buttons at document level.
      event.stopPropagation();
      if (isolated) {
        event.preventDefault();
        return;
      }
      const attribution = prepare();
      const body = JSON.stringify({
        eventType: 'whatsapp_click',
        source: 'whatsapp_click',
        sourceType: 'whatsapp_click',
        sourceButton: link.dataset.source,
        sourcePage: location.pathname,
        sourceUrl: location.href,
        pageUrl: location.href,
        vehicle: modelFor(link),
        market: link.dataset.market,
        attribution
      });
      const queued = navigator.sendBeacon?.('/api/whatsapp-clicks', new Blob([body], {type: 'application/json'}));
      if (!queued) {
        fetch('/api/whatsapp-clicks', {method: 'POST', headers: {'Content-Type': 'application/json'}, body, keepalive: true}).catch(() => {});
      }
    });
    function prepare() {
      const attribution = window.ZhongguTracking?.getAttribution() || null;
      const touches = [attribution?.first_ad_touch, attribution?.last_touch, attribution?.first_touch];
      updateChat(link, touches.some(touch => touch?.gclid || touch?.gbraid || touch?.wbraid));
      return attribution;
    }
  });
  refresh();
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if (heading) new MutationObserver(refresh).observe(heading, { childList: true, subtree: true });
})();
