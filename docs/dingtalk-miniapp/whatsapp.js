function whatsappLink(inquiry) {
  if (!inquiry || inquiry.replyChannel === 'email') return '';
  const digits = String(inquiry.whatsapp || '').trim().replace(/^\+/, '');
  return /^[1-9][0-9]{6,14}$/.test(digits) ? 'https://wa.me/' + digits : '';
}

module.exports = { whatsappLink };
