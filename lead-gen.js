const leadWhatsappNumber = '447473271351';
const leadWhatsappDisplayNumber = '+44 7473 271351';
const inquiryEmail = 'angelchengang@gmail.com';
const leadStoreKey = 'zhonggu-leads';

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeVehicleName = (name, brand = '') => {
  const cleanedName = String(name || '').replace(/\s+/g, ' ').trim();
  const cleanedBrand = String(brand || '').replace(/\s+/g, ' ').trim();
  if (!cleanedName || !cleanedBrand) return cleanedName;
  const brandPrefix = escapeRegExp(cleanedBrand);
  return cleanedName
    .replace(new RegExp(`^${brandPrefix}\\s+(${brandPrefix}\\S*)`, 'i'), '$1')
    .replace(new RegExp(`^(${brandPrefix})\\s+\\1\\b`, 'i'), '$1')
    .replace(/\s+/g, ' ')
    .trim();
};
const inquiryChannels = {
  google: { label: 'Google Search', whatsappSource: 'Google' },
  bing: { label: 'Bing Search', whatsappSource: 'Bing' },
  ouedkniss: { label: 'Ouedkniss', whatsappSource: 'Ouedkniss' },
  autodz: { label: 'AutoDZ', whatsappSource: 'AutoDZ' },
  facebook: { label: 'Facebook', whatsappSource: 'Facebook' },
  autobip: { label: 'AutoBip', whatsappSource: 'AutoBip' },
  website: { label: 'Website', whatsappSource: 'Website' }
};

const getInquirySource = () => {
  const source = normalize(new URLSearchParams(window.location.search).get('source')).toLowerCase();
  return inquiryChannels[source] ? source : 'website';
};

const whatsappSourceLabel = (source = getInquirySource()) => inquiryChannels[source]?.whatsappSource || inquiryChannels.website.whatsappSource;

const buildWhatsappSourceUrl = (message, source = getInquirySource()) => {
  const text = normalize(message).replace(/[.。]?$/, '.');
  return `https://wa.me/${leadWhatsappNumber}?text=${encodeURIComponent(`${text} Source: ${whatsappSourceLabel(source)}.`)}`;
};

const bindSourceWhatsappLinks = () => {
  document.querySelectorAll('[data-whatsapp-message]').forEach((link) => {
    const message = link.dataset.whatsappMessage;
    if (!message) return;
    link.href = buildWhatsappSourceUrl(message, link.dataset.whatsappSource || getInquirySource());
  });
};

window.zhongguBuildWhatsappLink = buildWhatsappSourceUrl;
const currentUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;
const currentTitle = () => normalize(document.title.replace(/\s+\|\s+Zhonggu Auto Export$/i, '').replace(/\s+\|\s+FOB Price and Stock List$/i, '')) || document.title;

const buildWhatsappMessage = (context = {}) => {
  const title = normalize(context.title || currentTitle());
  const model = normalize(context.model || '');
  const year = normalize(context.year || '');
  const price = normalize(context.price || '');
  const url = normalize(context.url || currentUrl());
  const lines = [
    `I am interested in ${title}. Please send me the latest FOB price and stock list.`,
    model && model !== title ? `Model: ${model}` : '',
    year ? `Year: ${year}` : '',
    price ? `Price: ${price}` : '',
    url ? `Page: ${url}` : ''
  ].filter(Boolean);
  return lines.join('\n');
};

const mailtoUrl = (lead) => {
  const subject = encodeURIComponent(`Zhonggu Auto Export Inquiry - ${lead.model || lead.pageTitle || 'Website Lead'}`);
  const body = encodeURIComponent([
    `Name: ${lead.name || ''}`,
    `Country: ${lead.country || ''}`,
    `WhatsApp: ${lead.whatsapp || ''}`,
    `Interested Model: ${lead.model || ''}`,
    `Message: ${lead.message || ''}`,
    `Page: ${lead.pageTitle || ''}`,
    `URL: ${lead.pageUrl || ''}`
  ].join('\n'));
  return `mailto:${inquiryEmail}?subject=${subject}&body=${body}`;
};

const buildLead = (form) => {
  const data = new FormData(form);
  return {
    name: normalize(data.get('name')),
    country: normalize(data.get('country')),
    whatsapp: normalize(data.get('whatsapp')),
    model: normalize(data.get('model')),
    message: normalize(data.get('message')),
    pageTitle: currentTitle(),
    pageUrl: currentUrl(),
    source: 'website',
    createdAt: new Date().toISOString()
  };
};

const saveLeadFallback = (lead) => {
  try {
    const existing = JSON.parse(localStorage.getItem(leadStoreKey) || '[]');
    existing.unshift(lead);
    localStorage.setItem(leadStoreKey, JSON.stringify(existing.slice(0, 200)));
  } catch {
    // Ignore storage failures.
  }
};

const ensureWhatsappButton = () => {
  if (document.querySelector('.floating-whatsapp-btn')) return;
  const button = document.createElement('a');
  button.className = 'floating-whatsapp-btn';
  const vehicleData = document.body.classList.contains('vehicle-detail-page') && window.ZhongguVehicleInquiry ? {
    id: document.body.dataset.vehicleId,
    brand: document.body.dataset.vehicleBrand,
    title: document.body.dataset.vehicleName,
    year: document.body.dataset.vehicleYear,
    price: document.body.dataset.vehiclePrice,
    detailUrl: document.body.dataset.vehicleUrl
  } : null;
  button.href = vehicleData
    ? window.ZhongguVehicleInquiry.buildVehicleWhatsappUrl(vehicleData)
    : buildWhatsappSourceUrl(buildWhatsappMessage());
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.title = leadWhatsappDisplayNumber;
  button.setAttribute('aria-label', `Chat on WhatsApp: ${leadWhatsappDisplayNumber}`);
  button.innerHTML = '<span class="floating-whatsapp-btn__icon" aria-hidden="true">WA</span><span class="floating-whatsapp-btn__text">WhatsApp</span>';
  document.body.appendChild(button);
};

const bindInquiryCtas = () => {
  document.querySelectorAll('.js-inquiry-cta').forEach((button) => {
    if (button.dataset.prefillBound === 'true') return;
    button.dataset.prefillBound = 'true';
    button.addEventListener('click', () => {
      const form = document.querySelector('.inquiry-form');
      if (!form) return;
      const context = {
        title: button.dataset.title || currentTitle(),
        model: button.dataset.model || button.dataset.title || '',
        year: button.dataset.year || '',
        price: button.dataset.price || '',
        url: button.dataset.url || currentUrl()
      };
      const modelField = form.elements.namedItem('model');
      const messageField = form.elements.namedItem('message');
      if (modelField) modelField.value = context.title;
      if (messageField) messageField.value = buildWhatsappMessage(context);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstField = form.querySelector('input, textarea, select');
      firstField?.focus({ preventScroll: true });
    });
  });
};

const bindDetailCtas = () => {
  document.querySelectorAll('[data-fob-cta]').forEach((button) => {
    if (button.dataset.ctaBound === 'true') return;
    button.dataset.ctaBound = 'true';
    button.addEventListener('click', () => {
      const form = document.querySelector('.inquiry-form');
      if (!form) return;
      const title = button.dataset.title || currentTitle();
      const modelField = form.elements.namedItem('model');
      const messageField = form.elements.namedItem('message');
      if (modelField) modelField.value = title;
      if (messageField) messageField.value = `I am interested in ${title}. Please send me the latest FOB price and stock list.`;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

const initLeadGen = () => {
  ensureWhatsappButton();
  bindInquiryCtas();
  bindDetailCtas();
  bindSourceWhatsappLinks();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeadGen, { once: true });
} else {
  initLeadGen();
}



