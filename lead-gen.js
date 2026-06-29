const whatsappNumber = '447473271351';
const inquiryEmail = 'angelchengang@gmail.com';
const leadStoreKey = 'zhonggu-leads';

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const currentUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;
const currentTitle = () => normalize(document.title.replace(/\s+\|\s+Zhonggu Auto Export$/i, '')) || document.title;

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
  const subject = encodeURIComponent(`Zhonggu Auto Export Inquiry - ${lead.interestedModel || lead.pageTitle || 'Website Lead'}`);
  const body = encodeURIComponent([
    `Name: ${lead.name || ''}`,
    `Country: ${lead.country || ''}`,
    `WhatsApp: ${lead.whatsapp || ''}`,
    `Interested Model: ${lead.interestedModel || ''}`,
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
    interestedModel: normalize(data.get('interestedModel')),
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
  button.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsappMessage())}`;
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.setAttribute('aria-label', 'Chat on WhatsApp');
  button.innerHTML = '<span class="floating-whatsapp-btn__icon" aria-hidden="true">WA</span><span class="floating-whatsapp-btn__text">WhatsApp</span>';
  document.body.appendChild(button);
};

const bindInquiryCtas = () => {
  document.querySelectorAll('.js-inquiry-cta').forEach((button) => {
    if (button.dataset.prefillBound === 'true') return;
    button.dataset.prefillBound = 'true';
    button.addEventListener('click', () => {
      const form = document.querySelector('.lead-form');
      if (!form) return;
      const context = {
        title: button.dataset.title || currentTitle(),
        model: button.dataset.model || button.dataset.title || '',
        year: button.dataset.year || '',
        price: button.dataset.price || '',
        url: button.dataset.url || currentUrl()
      };
      const modelField = form.elements.namedItem('interestedModel');
      const messageField = form.elements.namedItem('message');
      if (modelField) modelField.value = context.title;
      if (messageField) messageField.value = buildWhatsappMessage(context);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstField = form.querySelector('input, textarea, select');
      firstField?.focus({ preventScroll: true });
    });
  });
};

const bindLeadForms = () => {
  document.querySelectorAll('.lead-form').forEach((form) => {
    if (form.dataset.leadBound === 'true') return;
    form.dataset.leadBound = 'true';
    const panel = form.closest('.inquiry-panel');
    const successMessage = panel?.querySelector('.inquiry-success');
    const submitButton = form.querySelector('.inquiry-submit');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!form.reportValidity()) return;

      const lead = buildLead(form);
      const whatsappLink = mailtoUrl(lead);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        });
        if (!response.ok) throw new Error(`Lead save failed: ${response.status}`);
        saveLeadFallback(lead);
        if (successMessage) {
          successMessage.hidden = false;
          successMessage.classList.remove('is-error');
          successMessage.textContent = 'Thank you. Your inquiry has been saved and an email draft has been prepared.';
        }
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
        form.reset();
      } catch (error) {
        console.warn('Lead save fallback engaged.', error);
        saveLeadFallback(lead);
        if (successMessage) {
          successMessage.hidden = false;
          successMessage.classList.remove('is-error');
          successMessage.textContent = 'Your inquiry has been saved locally. An email draft has been prepared.';
        }
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit Inquiry';
        }
      }
    }, true);
  });
};

const bindDetailCtas = () => {
  document.querySelectorAll('[data-fob-cta]').forEach((button) => {
    if (button.dataset.ctaBound === 'true') return;
    button.dataset.ctaBound = 'true';
    button.addEventListener('click', () => {
      const form = document.querySelector('.lead-form');
      if (!form) return;
      const title = button.dataset.title || currentTitle();
      const modelField = form.elements.namedItem('interestedModel');
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
  bindLeadForms();
  bindDetailCtas();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeadGen, { once: true });
} else {
  initLeadGen();
}
