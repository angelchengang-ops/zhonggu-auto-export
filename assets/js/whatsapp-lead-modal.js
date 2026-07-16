(() => {
  const API_LEAD = "/api/public/whatsapp-lead";
  const CLICK_API = "/api/whatsapp-clicks";
  const SELECTOR = 'a[href*="wa.me"], a[href*="api.whatsapp.com"], [data-whatsapp-button="true"], [data-action="whatsapp"], .whatsapp-button, .whatsapp-btn';
  const STYLE_HREF = "/assets/css/whatsapp-lead-modal.css";
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const FALLBACK_VEHICLE = "Vehicles from Zhonggu Auto Export";
  const FALLBACK_VEHICLE_DISPLAY = "General Vehicle Inquiry";
  const GENERIC_TITLE_PATTERNS = [
    /zhonggu\s+auto\s+export/i,
    /china\s+vehicle\s+export\s+company/i,
    /chinese\s+vehicle\s+export\s+company/i,
    /reliable\s+new\s*&\s*used\s+cars?\s+export/i,
    /vehicle\s+export\s+partner/i,
    /cars?\s+from\s+china/i,
    /contact\s+us/i,
    /export\s+process/i
  ];
  const COUNTRY_CODE_OPTIONS = [
    { code: "+86", label: "+86 China", aliases: ["china", "\u4e2d\u56fd"] },
    { code: "+213", label: "+213 Algeria", aliases: ["algeria"] },
    { code: "+971", label: "+971 United Arab Emirates", aliases: ["uae", "u.a.e", "united arab emirates", "dubai"] },
    { code: "+966", label: "+966 Saudi Arabia", aliases: ["saudi arabia", "ksa"] },
    { code: "+7", label: "+7 Russia / Kazakhstan", aliases: ["russia", "kazakhstan"] },
    { code: "+998", label: "+998 Uzbekistan", aliases: ["uzbekistan"] },
    { code: "+996", label: "+996 Kyrgyzstan", aliases: ["kyrgyzstan"] },
    { code: "+234", label: "+234 Nigeria", aliases: ["nigeria"] },
    { code: "+225", label: "+225 Cote d'Ivoire", aliases: ["cote d'ivoire", "cote divoire", "ivory coast", "abidjan"] },
    { code: "+233", label: "+233 Ghana", aliases: ["ghana"] },
    { code: "+49", label: "+49 Germany", aliases: ["germany", "deutschland"] },
    { code: "+33", label: "+33 France", aliases: ["france"] },
    { code: "+39", label: "+39 Italy", aliases: ["italy", "italia"] },
    { code: "+34", label: "+34 Spain", aliases: ["spain", "espana"] },
    { code: "+254", label: "+254 Kenya", aliases: ["kenya"] },
    { code: "+255", label: "+255 Tanzania", aliases: ["tanzania"] },
    { code: "+27", label: "+27 South Africa", aliases: ["south africa"] },
    { code: "+44", label: "+44 United Kingdom", aliases: ["united kingdom", "uk", "britain", "england"] },
    { code: "+1", label: "+1 United States / Canada", aliases: ["united states", "usa", "us", "canada"] },
    { code: "+20", label: "+20 Egypt", aliases: ["egypt"] },
    { code: "+212", label: "+212 Morocco", aliases: ["morocco"] },
    { code: "+216", label: "+216 Tunisia", aliases: ["tunisia"] },
    { code: "+964", label: "+964 Iraq", aliases: ["iraq"] },
    { code: "+90", label: "+90 Turkey", aliases: ["turkey", "turkiye"] },
    { code: "+55", label: "+55 Brazil", aliases: ["brazil"] },
    { code: "+56", label: "+56 Chile", aliases: ["chile"] },
    { code: "+51", label: "+51 Peru", aliases: ["peru"] },
    { code: "+52", label: "+52 Mexico", aliases: ["mexico"] },
    { code: "+84", label: "+84 Vietnam", aliases: ["vietnam", "viet nam"] },
    { code: "+66", label: "+66 Thailand", aliases: ["thailand"] },
    { code: "+60", label: "+60 Malaysia", aliases: ["malaysia"] },
    { code: "+62", label: "+62 Indonesia", aliases: ["indonesia"] },
    { code: "+63", label: "+63 Philippines", aliases: ["philippines"] },
    { code: "+92", label: "+92 Pakistan", aliases: ["pakistan"] },
    { code: "+880", label: "+880 Bangladesh", aliases: ["bangladesh"] }
  ];
  const optionEscape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const COMMON_COUNTRY_CODES = [
    { code: "+86", label: "China" },
    { code: "+213", label: "Algeria" },
    { code: "+971", label: "UAE" },
    { code: "+966", label: "Saudi" },
    { code: "+7", label: "Russia/Kazakhstan" },
    { code: "+234", label: "Nigeria" },
    { code: "+225", label: "Cote d'Ivoire" },
    { code: "+44", label: "UK" },
    { code: "+1", label: "US/Canada" }
  ];
  const commonCountryCodeButtonsHtml = () => COMMON_COUNTRY_CODES.map((item) => '<button class="zg-wa-code-shortcut" type="button" data-code="' + optionEscape(item.code) + '" title="' + optionEscape(item.code + " " + item.label) + '"><span>' + optionEscape(item.code) + '</span><small>' + optionEscape(item.label) + '</small></button>').join("");
  const countryKey = (value) => normalize(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
  const suggestCountryCode = (country) => {
    const key = countryKey(country);
    if (!key) return "";
    const found = COUNTRY_CODE_OPTIONS.find((item) => item.aliases.some((alias) => {
      const aliasKey = countryKey(alias);
      return aliasKey.length <= 3 ? key === aliasKey : key.includes(aliasKey);
    }));
    return found?.code || "";
  };
  const phoneDigits = (value) => normalize(value).replace(/^00/, "").replace(/\D/g, "");
  const normalizeCountryCodeInput = (value) => {
    const raw = normalize(value).replace(/[\s\-()]/g, "");
    const digits = raw.replace(/^\+/, "").replace(/^00/, "").replace(/\D/g, "");
    return digits ? "+" + digits : "";
  };
  const buildWhatsappParts = (countryCode, whatsappLocal) => {
    const normalizedCode = normalizeCountryCodeInput(countryCode);
    const codeDigits = phoneDigits(normalizedCode);
    const localDigits = phoneDigits(whatsappLocal);
    let localForSave = localDigits;
    let whatsapp = "";
    if (codeDigits && localDigits.startsWith(codeDigits) && localDigits.length > codeDigits.length + 4) {
      whatsapp = localDigits;
      localForSave = localDigits.slice(codeDigits.length);
    } else {
      whatsapp = codeDigits + localDigits;
    }
    return {
      countryCode: normalizedCode,
      whatsappLocal: localForSave,
      rawWhatsapp: codeDigits && localForSave ? normalizedCode + " " + localForSave : "",
      whatsapp
    };
  };
  let activeContext = null;
  let modal = null;
  let messageTouchedByUser = false;
  let lastAutoMessage = "";
  let countryCodeTouchedByUser = false;
  let lastAutoCountryCode = "";
  let isSubmitting = false;
  const successAutoClose = false;
  const LEAD_SESSION_KEY = "zg_whatsapp_lead_session_id";
  const pad2 = (value) => String(value).padStart(2, "0");
  const buildLeadSessionId = () => {
    const now = new Date();
    const stamp = String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate()) + pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    const random = Math.random().toString(36).slice(2, 8);
    return "ls_" + stamp + "_" + random;
  };
  const getLeadSessionId = () => {
    try {
      const existing = sessionStorage.getItem(LEAD_SESSION_KEY);
      if (existing) return existing;
      const next = buildLeadSessionId();
      sessionStorage.setItem(LEAD_SESSION_KEY, next);
      return next;
    } catch {
      if (!window.__zgWhatsappLeadSessionId) window.__zgWhatsappLeadSessionId = buildLeadSessionId();
      return window.__zgWhatsappLeadSessionId;
    }
  };

  const ensureStyle = () => {
    if (document.querySelector(`link[href="${STYLE_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
  };
  const sourcePagePath = () => window.location.pathname || "/";
  const pagePath = () => sourcePagePath() + window.location.search;
  const cleanTitle = (value) => normalize(String(value || "").replace(/\s+\|\s+Zhonggu Auto Export$/i, "").replace(/\s+\|\s+FOB Price and Stock List$/i, ""));
  const isHomePage = () => sourcePagePath() === "/" || /\/index\.html$/i.test(sourcePagePath());
  const isGenericVehicleName = (value) => {
    const clean = cleanTitle(value);
    if (!clean) return true;
    if (clean.toLowerCase() === FALLBACK_VEHICLE.toLowerCase()) return true;
    if (clean.toLowerCase() === FALLBACK_VEHICLE_DISPLAY.toLowerCase()) return true;
    return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(clean));
  };
  const pageTitle = () => cleanTitle(document.body.dataset.vehicleName || document.querySelector("h1")?.textContent || document.title);
  const inferVehicle = (element) => {
    const explicit = normalize(element?.dataset?.vehicle || element?.dataset?.model || element?.dataset?.car);
    if (explicit && !isGenericVehicleName(explicit)) return explicit;
    if (isHomePage()) return FALLBACK_VEHICLE;
    const bodyVehicle = normalize(document.body.dataset.vehicleName || document.body.dataset.vehicleModel || "");
    if (bodyVehicle && !isGenericVehicleName(bodyVehicle)) return bodyVehicle;
    const metaVehicle = normalize(document.querySelector('meta[name="vehicle"]')?.content || document.querySelector('meta[property="vehicle"]')?.content || "");
    if (metaVehicle && !isGenericVehicleName(metaVehicle)) return metaVehicle;
    const heading = pageTitle();
    return isGenericVehicleName(heading) ? FALLBACK_VEHICLE : heading;
  };
  const inferMarket = (element) => normalize(element?.dataset?.market || document.body.dataset.marketCountry || document.body.dataset.marketRegion || "");
  const inferSource = (element) => normalize(element?.dataset?.source || element?.dataset?.whatsappSource || element?.textContent || element?.getAttribute?.("aria-label") || "WhatsApp button");
  const contextFromElement = (element) => ({
    element,
    vehicle: inferVehicle(element),
    market: inferMarket(element),
    sourceButton: inferSource(element),
    type: normalize(element?.dataset?.type || ""),
    sourcePage: normalize(element?.dataset?.page || sourcePagePath()),
    sourceUrl: window.location.href,
    leadSessionId: getLeadSessionId(),
    vehicleFromPage: inferVehicle(element),
    marketFromPage: normalize(document.body.dataset.marketCountry || document.body.dataset.marketRegion || "")
  });
  const track = (eventType, context = {}, extra = {}) => {
    const payload = {
      eventType,
      leadSessionId: context.leadSessionId || getLeadSessionId(),
      pageUrl: window.location.href,
      page: pagePath(),
      buttonText: context.sourceButton || "WhatsApp button",
      sourcePage: context.sourcePage || sourcePagePath(),
      sourceUrl: context.sourceUrl || window.location.href,
      sourceButton: context.sourceButton || "WhatsApp button",
      model: context.vehicle || context.vehicleFromPage || FALLBACK_VEHICLE,
      vehicle: context.vehicle || context.vehicleFromPage || FALLBACK_VEHICLE,
      market: context.market || context.marketFromPage || "",
      source: "whatsapp_click",
      sourceType: "whatsapp_click",
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent || "",
      ...extra
    };
    const summary = { api: CLICK_API, eventType, vehicle: payload.vehicle, page: payload.pageUrl };
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const queued = navigator.sendBeacon(CLICK_API, new Blob([body], { type: "application/json" }));
        if (queued) {
          console.info("Zhonggu WhatsApp click tracked", { ...summary, queued: true });
          return;
        }
        console.warn("Zhonggu WhatsApp tracking failed", { ...summary, error: "sendBeacon not queued" });
      }
      fetch(CLICK_API, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        .then((response) => {
          const info = { ...summary, status: response.status, ok: response.ok };
          if (response.ok) console.info("Zhonggu WhatsApp click tracked", info);
          else console.warn("Zhonggu WhatsApp tracking failed", info);
        })
        .catch((error) => console.warn("Zhonggu WhatsApp tracking failed", { ...summary, error: error.message }));
    } catch (error) {
      console.warn("Zhonggu WhatsApp tracking failed", { ...summary, error: error.message });
    }
  };
  const hasSpecificVehicle = (value) => !isGenericVehicleName(value);
  const crmVehicleValue = (value) => isGenericVehicleName(value) ? FALLBACK_VEHICLE : normalize(value);
  const buildDefaultMessage = (context = {}, vehicleOverride = "") => {
    const vehicle = crmVehicleValue(vehicleOverride || context.vehicle || context.vehicleFromPage || "");
    if (vehicle && hasSpecificVehicle(vehicle)) {
      return "I am interested in " + vehicle + ". Please send me the FOB price, available stock and shipping options.";
    }
    return "I am interested in vehicles from Zhonggu Auto Export. Please send me FOB prices and shipping options.";
  };
  const syncAutoMessage = (force = false) => {
    if (!modal?.form) return;
    const messageField = modal.form.elements.message;
    const vehicleField = modal.form.elements.vehicle;
    if (!messageField || !vehicleField) return;
    const current = normalize(messageField.value);
    if (!force && messageTouchedByUser && current !== normalize(lastAutoMessage)) return;
    lastAutoMessage = buildDefaultMessage(activeContext || {}, vehicleField.value || FALLBACK_VEHICLE);
    messageField.value = lastAutoMessage;
    messageTouchedByUser = false;
  };
  const syncCountryCodeFromCountry = (force = false) => {
    if (!modal?.form) return;
    const countryField = modal.form.elements.country;
    const codeField = modal.form.elements.leadCountryCode;
    if (!countryField || !codeField) return;
    const suggested = suggestCountryCode(countryField.value);
    if (!suggested) {
      if (force && !countryCodeTouchedByUser && !normalize(codeField.value)) {
        codeField.value = "";
        lastAutoCountryCode = "";
      }
      return;
    }
    if (!countryCodeTouchedByUser && !normalize(codeField.value)) {
      codeField.value = suggested;
      lastAutoCountryCode = suggested;
      countryCodeTouchedByUser = false;
    }
  };
  const createModal = () => {
    if (modal) return modal;
    ensureStyle();
    const overlay = document.createElement("div");
    overlay.className = "zg-wa-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <section class="zg-wa-dialog" aria-labelledby="zgWaTitle">
        <header class="zg-wa-head">
          <div><h2 class="zg-wa-title" id="zgWaTitle">Get FOB Price on WhatsApp</h2><p class="zg-wa-subtitle">Please leave your WhatsApp number. Our sales manager will contact you shortly.</p></div>
          <button class="zg-wa-close" type="button" aria-label="Close">&times;</button>
        </header>
        <form class="zg-wa-form" novalidate autocomplete="off">
          <div class="zg-wa-grid">
            <label class="zg-wa-field">Name <input name="name" autocomplete="name" required></label>
            <label class="zg-wa-field">Country / Region <input name="country" autocomplete="country-name" required></label>
            <label class="zg-wa-field zg-wa-span">WhatsApp <div class="zg-wa-phone-row"><input type="text" name="leadCountryCode" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="tel" placeholder="+86" required><input type="text" name="leadWhatsappLocal" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="tel" placeholder="Your WhatsApp number" required></div><div class="zg-wa-code-shortcuts" aria-label="Common country codes"><span>Common codes:</span>${commonCountryCodeButtonsHtml()}</div></label>
            <label class="zg-wa-field zg-wa-span">Vehicle / Requirement <input name="vehicle" required></label>
            <label class="zg-wa-field zg-wa-span">Message <textarea name="message" maxlength="1000" placeholder="Please send FOB prices and shipping options."></textarea></label>
          </div>
          <details class="zg-wa-more">
            <summary><span data-more-label>+ More details</span></summary>
            <div class="zg-wa-grid zg-wa-more-grid">
              <label class="zg-wa-field">Quantity <input name="quantity" inputmode="numeric" placeholder="1"></label>
              <label class="zg-wa-field">Destination Port <input name="destinationPort" placeholder="Algiers / Dubai / London"></label>
              <label class="zg-wa-field">FOB / CIF <select name="quoteType"><option value="FOB">FOB</option><option value="CIF">CIF</option><option value="Unknown">Not sure yet</option></select></label>
            </div>
          </details>
          <label class="zg-wa-hp" aria-hidden="true">Company Website <input type="text" name="leadCompanyTrap" tabindex="-1" autocomplete="new-password"></label>
          <p class="zg-wa-status" role="status" aria-live="polite"></p>
          <div class="zg-wa-actions"><button class="zg-wa-secondary" type="button" data-close>Close</button><button class="zg-wa-submit" type="submit">Submit Inquiry</button></div>
        </form>
        <div class="zg-wa-success" aria-live="polite"><div class="zg-wa-success-icon" aria-hidden="true"></div><h3>Thank you. Your inquiry has been received.</h3><p>Our sales manager will contact you on WhatsApp shortly.</p><p class="zg-wa-success-small">Your request has been saved in our CRM.</p><div class="zg-wa-actions"><button class="zg-wa-secondary" type="button" data-close>Close</button></div></div>
      </section>`;
    document.body.appendChild(overlay);
    modal = {
      overlay,
      form: overlay.querySelector("form"),
      status: overlay.querySelector(".zg-wa-status"),
      success: overlay.querySelector(".zg-wa-success"),
      submit: overlay.querySelector(".zg-wa-submit")
    };
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    overlay.querySelectorAll("[data-close], .zg-wa-close").forEach((button) => button.addEventListener("click", close));
    modal.form.addEventListener("submit", submit);
    modal.form.elements.message.addEventListener("input", () => { messageTouchedByUser = normalize(modal.form.elements.message.value) !== normalize(lastAutoMessage); });
    modal.form.elements.vehicle.addEventListener("input", () => syncAutoMessage(false));
    modal.form.elements.country.addEventListener("input", () => syncCountryCodeFromCountry(false));
    modal.form.elements.leadCountryCode.addEventListener("input", () => { countryCodeTouchedByUser = true; });
    modal.form.elements.leadCountryCode.addEventListener("change", () => { countryCodeTouchedByUser = true; });
    modal.form.elements.leadCountryCode.addEventListener("blur", () => { modal.form.elements.leadCountryCode.value = normalizeCountryCodeInput(modal.form.elements.leadCountryCode.value); });
    overlay.querySelectorAll(".zg-wa-code-shortcut").forEach((button) => button.addEventListener("click", () => {
      modal.form.elements.leadCountryCode.value = button.dataset.code || "";
      countryCodeTouchedByUser = true;
      modal.form.elements.leadWhatsappLocal.focus();
    }));
    const more = overlay.querySelector(".zg-wa-more");
    more?.addEventListener("toggle", () => { const label = more.querySelector("[data-more-label]"); if (label) label.textContent = more.open ? "Less details" : "+ More details"; });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && overlay.classList.contains("is-open")) close(); });
    return modal;
  };
  const resetUiState = (ui = modal) => {
    if (!ui) return;
    isSubmitting = false;
    messageTouchedByUser = false;
    lastAutoMessage = "";
    countryCodeTouchedByUser = false;
    lastAutoCountryCode = "";
    ui.form.hidden = false;
    ui.success.classList.remove("is-open");
    ui.status.textContent = "";
    ui.status.classList.remove("is-error");
    const successTitle = ui.success.querySelector("h3");
    const successText = ui.success.querySelectorAll("p");
    if (successTitle) successTitle.textContent = "Thank you. Your inquiry has been received.";
    if (successText[0]) successText[0].textContent = "Our sales manager will contact you on WhatsApp shortly.";
    if (successText[1]) successText[1].textContent = "Your request has been saved in our CRM.";
    ui.submit.disabled = false;
    ui.submit.textContent = "Submit Inquiry";
  };
  const open = (context = {}) => {
    activeContext = { ...context, leadSessionId: context.leadSessionId || getLeadSessionId() };
    const ui = createModal();
    resetUiState(ui);
    ui.form.reset();
    const detectedVehicle = context.vehicle || context.vehicleFromPage || FALLBACK_VEHICLE;
    const displayVehicle = isGenericVehicleName(detectedVehicle) ? FALLBACK_VEHICLE_DISPLAY : detectedVehicle;
    ui.form.elements.vehicle.value = displayVehicle;
    ui.form.elements.vehicle.title = crmVehicleValue(detectedVehicle);
    const more = ui.overlay.querySelector(".zg-wa-more");
    if (more) { more.open = false; const label = more.querySelector("[data-more-label]"); if (label) label.textContent = "+ More details"; }
    ui.form.elements.quoteType.value = "FOB";
    syncCountryCodeFromCountry(true);
    syncAutoMessage(true);
    ui.overlay.classList.add("is-open");
    document.documentElement.classList.add("zg-wa-modal-lock");
    window.setTimeout(() => ui.form.elements.name.focus(), 60);
    track("whatsapp_form_open", activeContext);
  };
  function close() {
    if (!modal) return;
    modal.overlay.classList.remove("is-open");
    document.documentElement.classList.remove("zg-wa-modal-lock");
    resetUiState(modal);
    modal.form.reset();
  }
  const fieldError = (name, message) => {
    const field = modal.form.elements[name];
    modal.status.textContent = message;
    modal.status.classList.add("is-error");
    field?.focus();
  };
  async function submit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const ui = createModal();
    const form = ui.form;
    const data = Object.fromEntries(new FormData(form));
    const required = [
      ["name", "Please enter your name."],
      ["country", "Please enter your country."],
      ["leadCountryCode", "Please select country code and enter your WhatsApp number."],
      ["leadWhatsappLocal", "Please select country code and enter your WhatsApp number."],
      ["vehicle", "Please enter the vehicle model."]
    ];
    for (const [name, message] of required) {
      if (!normalize(data[name])) return fieldError(name, message);
    }
    const whatsappParts = buildWhatsappParts(data.leadCountryCode, data.leadWhatsappLocal);
    if (!whatsappParts.countryCode || !whatsappParts.whatsappLocal || whatsappParts.whatsappLocal.length < 5) return fieldError("leadWhatsappLocal", "Please select country code and enter your WhatsApp number.");
    if (!/^\d{8,15}$/.test(whatsappParts.whatsapp)) return fieldError("leadWhatsappLocal", "Please enter a valid WhatsApp number with country code.");
    form.elements.leadCountryCode.value = whatsappParts.countryCode;
    form.elements.leadWhatsappLocal.value = whatsappParts.whatsappLocal;
    ui.status.textContent = "";
    ui.status.classList.remove("is-error");
    isSubmitting = true;
    ui.submit.disabled = true;
    ui.submit.textContent = "Submitting...";
    const payload = {
      name: data.name,
      countryCode: whatsappParts.countryCode,
      whatsappLocal: whatsappParts.whatsappLocal,
      rawWhatsapp: whatsappParts.rawWhatsapp,
      whatsapp: whatsappParts.whatsapp,
      country: data.country,
      vehicle: data.vehicle,
      vehicleDetail: crmVehicleValue(data.vehicle),
      rawVehicleLabel: crmVehicleValue(data.vehicle),
      quantity: data.quantity,
      destinationPort: data.destinationPort,
      quoteType: data.quoteType || "FOB",
      message: data.message,
      leadCompanyTrap: data.leadCompanyTrap,
      sourceType: "website_form",
      sourceChannel: "whatsapp_button",
      sourceEntry: "get_fob_price_modal",
      leadSessionId: activeContext?.leadSessionId || getLeadSessionId(),
      sourceDetail: "Website WhatsApp Button",
      sourceSubType: "website_whatsapp_button",
      sourcePage: activeContext?.sourcePage || sourcePagePath(),
      sourceUrl: activeContext?.sourceUrl || window.location.href,
      sourceButton: activeContext?.sourceButton || "WhatsApp button",
      vehicleFromPage: crmVehicleValue(activeContext?.vehicleFromPage || data.vehicle),
      market: activeContext?.market || activeContext?.marketFromPage || "",
      marketFromPage: activeContext?.marketFromPage || "",
      type: activeContext?.type || "",
      createdFrom: "website_whatsapp_button"
    };
    try {
      console.info("Zhonggu WhatsApp lead submit start", { api: API_LEAD, vehicle: payload.vehicle, page: payload.sourceUrl });
      const response = await fetch(API_LEAD, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const responseText = await response.text();
      let result = {};
      try { result = responseText ? JSON.parse(responseText) : {}; } catch { result = {}; }
      console.info("Zhonggu CRM API response", { status: response.status, ok: response.ok, stored: result.stored, id: result.id, source: result.source });
      if (!response.ok || result.success === false || result.ok === false || result.stored !== true) {
        let message = "Submission failed. Please check your information and try again.";
        if (response.status === 405) message = "Submission failed: API method is not allowed. Please check backend route POST /api/public/whatsapp-lead.";
        else if (response.status === 404) message = "Submission failed: lead submit API not found.";
        else if (result.error) message = result.error;
        console.error("WhatsApp lead submit failed", { submitUrl: API_LEAD, status: response.status, responseText });
        const submitError = new Error(message);
        submitError.logged = true;
        throw submitError;
      }
      const successTitle = ui.success.querySelector("h3");
      const successText = ui.success.querySelectorAll("p");
      if (result.id) console.info("Zhonggu WhatsApp lead saved ok", { id: result.id, source: result.source, stored: result.stored });
      if (result.duplicate) {
        if (successTitle) successTitle.textContent = "Thank you. Your inquiry has already been received.";
        if (successText[0]) successText[0].textContent = "Our sales manager will contact you on WhatsApp shortly.";
        if (successText[1]) successText[1].textContent = "";
      }
      form.hidden = true;
      ui.submit.disabled = true;
      ui.success.classList.add("is-open");
      if (successAutoClose) window.setTimeout(close, 3000);
    } catch (error) {
      if (!error?.logged) console.error("WhatsApp lead submit failed", { submitUrl: API_LEAD, status: 0, responseText: error?.message || "" });
      ui.status.textContent = error.message || "Submission failed. Please check your information and try again.";
      ui.status.classList.add("is-error");
    } finally {
      if (!form.hidden) {
        isSubmitting = false;
        ui.submit.disabled = false;
        ui.submit.textContent = "Submit Inquiry";
      }
    }
  }
  const isTarget = (element) => element && element.closest && element.closest(SELECTOR);
  const handleClick = (event) => {
    const target = isTarget(event.target);
    if (!target || target.closest(".zg-wa-dialog")) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    open(contextFromElement(target));
  };
  const attach = (root = document) => {
    ensureStyle();
    root.querySelectorAll?.(SELECTOR).forEach((element) => {
      element.dataset.whatsappButton = "true";
      if (element.tagName === "A" && !element.dataset.originalWhatsappHref) element.dataset.originalWhatsappHref = element.getAttribute("href") || "";
      if (element.tagName === "A") element.setAttribute("href", "#contact-whatsapp");
    });
  };
  document.addEventListener("click", handleClick, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => attach(), { once: true });
  else attach();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) mutation.addedNodes.forEach((node) => { if (node.nodeType === 1) attach(node); });
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  window.ZhongguWhatsappLeadModal = { open, close, attach };
})();
