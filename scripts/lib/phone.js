(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('libphonenumber-js/max'));
  else root.ZhongguPhone = factory(root.libphonenumber);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (lib) {
  const digits = (value) => String(value || '').normalize('NFKC')
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
  // HTML pattern uses Unicode v: parentheses and hyphens must be escaped.
  const pattern = String.raw`[+0-9۰-۹٠-٩０-９\s.\(\)\-]{5,40}`;
  const normalize = (value, callingCode = '') => {
    const raw = digits(value).trim();
    const code = digits(callingCode).replace(/^\+|^00/g, '');
    if (!raw || !/^[+0-9\s.()\-]+$/.test(raw)) return null;
    try {
      // Explicit + / 00 overrides the selected region. National prefixes are
      // interpreted by the country metadata, never stripped indiscriminately.
      const phone = lib.parsePhoneNumberFromString(raw.replace(/^00/, '+'), {
        defaultCallingCode: /^\d{1,3}$/.test(code) ? code : undefined, extract: false
      });
      if (!phone || !phone.isValid() || phone.ext) return null;
      return { number: phone.number, callingCode: '+' + phone.countryCallingCode,
        nationalNumber: phone.nationalNumber, country: phone.country || '', formatted: phone.formatInternational() };
    } catch { return null; }
  };
  const countries = (language = 'en') => {
    let names;
    try { names = new Intl.DisplayNames([language], { type: 'region' }); } catch { /* ISO fallback */ }
    return lib.getCountries().map(country => ({ country, callingCode: '+' + lib.getCountryCallingCode(country),
      label: `${names?.of(country) || country} (+${lib.getCountryCallingCode(country)})` }))
      .sort((a, b) => a.label.localeCompare(b.label, language));
  };
  const errorMessage = (language = 'en') => ({
    ar: 'أدخل رقم هاتف صحيحاً مع اختيار رمز الدولة، أو أدخل الرقم الدولي كاملاً بدءاً بعلامة +.',
    fa: 'شماره معتبر و کد کشور را وارد کنید، یا شماره کامل بین‌المللی را با + بنویسید.',
    fr: 'Saisissez un numéro valide avec son indicatif, ou le numéro international complet avec +.',
    ru: 'Укажите корректный номер и код страны или полный международный номер с +.',
    es: 'Introduzca un número válido y su prefijo, o el número internacional completo con +.'
  }[language] || 'Enter a valid phone number and country code, or a full international number starting with +.');
  return { normalize, countries, digits, pattern, errorMessage };
});
