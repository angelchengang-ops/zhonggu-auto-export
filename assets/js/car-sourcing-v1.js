(() => {
  const price = document.getElementById('sourcing-price');
  const fee = document.getElementById('sourcing-fee');
  const dollars = new Intl.NumberFormat(document.documentElement.lang, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'code'
  });
  price.addEventListener('input', () => {
    const amount = price.valueAsNumber;
    fee.value = price.validity.valid && Number.isFinite(amount) && amount > 0
      ? dollars.format(Math.max(500, amount * 0.05))
      : '—';
  });
})();
