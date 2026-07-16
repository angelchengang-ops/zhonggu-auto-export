const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const whatsappDisplayNumber = "+86 18661888866";
const fallbackVehicleInquiry = (() => {
  const text = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return text(value.en || Object.values(value).find(Boolean));
    return String(value || "").replace(/\s+/g, " ").trim();
  };
  const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const formatVehicleName = (car = {}) => {
    const brand = text(car.brand);
    const name = text(car.title || car.model || car.name || car.id);
    if (!name) return brand || "Vehicle";
    if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) return name;
    return `${brand} ${name}`;
  };
  const vehicleSlug = (car = {}) => text(car.slug || car.id) || slugify(formatVehicleName(car));
  const vehicleDetailUrl = (car = {}) => `https://www.zhongguauto.com/${vehicleSlug(car)}.html`;
  const buildVehicleMessage = (car = {}) => {
    const title = formatVehicleName(car);
    const price = text(car.fobPriceDisplay || car.fobNanShaUsd || car.price || car.guidePriceDisplay || car.guidePriceRmb || car.fobRange);
    const url = text(car.detailUrl || car.url) || vehicleDetailUrl(car);
    return [`I am interested in ${title}. Please send me the latest FOB price and stock list.`, `Model: ${title}`, price ? `Price: ${price}` : "", url ? `Page: ${url}` : ""].filter(Boolean).join("\n");
  };
  return { formatVehicleName, vehicleSlug, vehicleDetailUrl, buildVehicleMessage };
})();
const vehicleInquiry = window.ZhongguVehicleInquiry || fallbackVehicleInquiry;
window.trackEvent = window.trackEvent || ((eventName, parameters = {}) => {
  if (typeof window.gtag === "function") window.gtag("event", eventName, parameters);
});
const APP_VERSION = "20260626-data-engine-v1";

const languageOptions = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", dir: "rtl" },
  { value: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", dir: "ltr" },
  { value: "fr", label: "Fran\u00e7ais", dir: "ltr" },
  { value: "es", label: "Espa\u00f1ol", dir: "ltr" }
];

const en = {
  "nav.home": "Home",
  "nav.newCars": "New Cars",
  "nav.usedCars": "Used Cars",
  "nav.brands": "Brands",
  "nav.company": "Company",
  "nav.process": "Export Process",
  "nav.contact": "Contact Us",
  "hero.eyebrow": "Direct sourcing Global shipping Trusted service",
  "hero.title": "Reliable New & Used Cars Exporter from China",
  "hero.subtitle": "Quality vehicles, competitive prices, and dependable export support for dealers and buyers worldwide.",
  "hero.explore": "Explore Vehicles",
  "hero.quote": "Request FOB Quote",
  "hero.statsBrands": "Leading Brands",
  "hero.statsSupport": "Export Support",
  "hero.statsSupportValue": "100%",
  "hero.statsNetwork": "Shipping Network",
  "hero.statsNetworkValue": "Global",
  "brands.eyebrow": "Our partners",
  "brands.title": "Popular Chinese Car Brands",
  "brands.subtitle": "Access a wide selection from trusted manufacturers.",
  "new.eyebrow": "Latest inventory",
  "new.title": "Featured New Cars",
  "new.subtitle": "Factory-fresh vehicles ready for international delivery.",
  "used.eyebrow": "Inspected & verified",
  "used.pageTitle": "Used Cars Available in China",
  "used.pageSubtitle": "Browse imported used-car inventory with photos, videos, mileage, colors, and configuration details.",
  "used.title": "Featured Used Cars",
  "used.subtitle": "Carefully selected vehicles with transparent condition details.",
  "used.viewAll": "View All Used Cars",
  "process.eyebrow": "Simple and transparent",
  "process.title": "Our Export Process",
  "process.subtitle": "From your first inquiry to delivery at your destination port.",
  "process.choose": "Choose a Vehicle",
  "process.chooseText": "Tell us your preferred model, quantity, and destination.",
  "process.confirm": "Confirm & Inspect",
  "process.confirmText": "We confirm specifications and provide condition details.",
  "process.payment": "Payment & Documents",
  "process.paymentText": "Secure payment and complete all export documentation.",
  "process.shipping": "Shipping & Delivery",
  "process.shippingText": "Your vehicle is shipped with regular tracking updates.",
  "contact.eyebrow": "Start your order today",
  "contact.title": "Looking for a Specific Vehicle?",
  "contact.subtitle": "Send us your requirements and receive a competitive export quotation.",
  "contact.whatsapp": "Chat on WhatsApp",
  "form.title": "Inquiry Form",
  "form.name": "Name",
  "form.country": "Country",
  "form.whatsapp": "WhatsApp",
  "form.vehicle": "Interested Model",
  "form.message": "Message",
  "form.submit": "Request FOB Quote",
  "form.success": "Thank you, your inquiry has been received. Our sales team will contact you soon by WhatsApp or email.",
  "footer.tagline": "Reliable vehicles from China, delivered worldwide.",
  "footer.rights": "Zhonggu Auto Export. All rights reserved.",
  "car.used": "Used Car",
  "car.new": "New Car",
  "car.available": "Available for export from China with FOB support",
  "car.fob_price": "FOB Price",
  "car.ask_fob": "Request FOB Quote",
  "company.heroEyebrow": "About Zhonggu Auto Export",
  "company.heroTitle": "Reliable Vehicle Export Partner from China",
  "company.heroSubtitle": "Professional sourcing, inspection, documentation and delivery support for new cars, used vehicles and new energy vehicles.",
  "company.viewVehicles": "View Vehicles",
  "company.legalNameZh": "中谷国际贸易（青岛）有限公司",
  "company.legalNameEn": "Zhonggu International Trade (Qingdao) Co., Ltd.",
  "company.brandName": "Zhonggu Auto Export",
  "company.heroPanelText": "New cars, used vehicles and new energy vehicles for global buyers.",
  "company.trustBadgePilot": "First Batch Used Car Export Pilot Enterprise",
  "company.trustBadgeTax": "A-Class Taxpayer Enterprise",
  "company.trustBadgeExporter": "Government Registered Exporter",
  "company.trustBadgeNetwork": "Full 4S Network Coverage",
  "company.proofPilotTitle": "First-Batch Pilot Enterprise",
  "company.proofPilotText": "One of China's first-batch pilot enterprises for used vehicle export",
  "company.proofTaxTitle": "A-Class Taxpayer",
  "company.proofTaxText": "A-Class taxpayer enterprise with standardized and compliant operations",
  "company.proofRevenueTitle": "USD 100M+",
  "company.proofRevenueText": "Annual vehicle export-related revenue",
  "company.proofNetworkTitle": "Multi-Brand 4S Network",
  "company.proofNetworkText": "Volkswagen, SAIC, FAW, Geely, BYD, GAC and other brand resources",
  "company.kpi4s": "Authorized 4S Partners",
  "company.kpiVehicles": "Vehicles Exported",
  "company.kpiCountries": "Countries Covered",
  "company.kpiCapacityValue": "USD 100M+",
  "company.kpiRevenue": "Annual Export Revenue",
  "company.aboutEyebrow": "About Zhonggu Auto Export",
  "company.aboutTitle": "Built for global B2B vehicle export",
  "company.aboutSummary": "Zhonggu International Trade (Qingdao) Co., Ltd. is a China-based professional vehicle export company, serving global dealers and fleet buyers with reliable, compliant, and efficient export solutions.",
  "company.aboutOverviewTitle": "Company Overview",
  "company.aboutIntro": "Zhonggu Auto Export is a China-based professional vehicle export company under Zhonggu International Trade (Qingdao) Co., Ltd.",
  "company.aboutCoreLabel": "Core Strengths",
  "company.aboutCore1": "<strong>First-batch pilot enterprise</strong><br>for used vehicle export in China",
  "company.aboutCore2": "<strong>A-Class taxpayer enterprise</strong><br>with compliant operations",
  "company.aboutCore3": "<strong>Multi-brand &amp; network</strong><br>covering Volkswagen, SAIC, FAW, Geely, BYD and GAC",
  "company.aboutCore4": "<strong>Professional inspection and export coordination system</strong>",
  "company.aboutMission": "With over USD 100M annual export-related revenue, we serve global dealers and fleet buyers with stable and efficient export solutions. Mission: connect global buyers with high-quality Chinese vehicles through trusted sourcing and reliable delivery.",
  "company.coreCapabilitiesTitle": "Core Capabilities",
  "company.miniExportTitle": "Export Capability",
  "company.miniExportText": "Certified export documentation<br>Compliance-ready sourcing",
  "company.miniDealerTitle": "Dealer Network",
  "company.miniDealerText": "45+ active sourcing system<br>Multi-brand coverage",
  "company.miniInspectionTitle": "Inspection System",
  "company.miniInspectionText": "Pre-shipment inspection<br>Condition verification",
  "company.miniLogisticsTitle": "Logistics System",
  "company.miniLogisticsText": "Global shipping coordination<br>Export delivery support",
  "company.networkEyebrow": "Brand & 4S Store Network",
  "company.networkTitle": "Multi-brand sourcing supported by dealership resources",
  "company.networkText": "Our dealership and 4S store resources allow us to provide reliable vehicle sourcing, condition verification and after-sales coordination.",
  "company.mediaEyebrow": "Media Section",
  "company.mediaTitle": "Company Strength Display",
  "company.mediaSubtitle": "Trusted Export Infrastructure",
  "company.mediaText": "Based on real export operations and dealership supply chain",
  "company.mediaPreparation": "Vehicle Preparation",
  "company.mediaInspection": "Pre-Shipment Inspection",
  "company.mediaDelivery": "Customer Delivery",
  "company.mediaLoading": "Export Loading",
  "company.videoEyebrow": "Company Videos",
  "company.videos": "Company Videos",
  "company.videoText": "Operational footage from live export workflow",
  "company.videoCategoryInspection": "Inspection",
  "company.videoCategoryLoading": "Loading",
  "company.videoCard1Title": "Pre-shipment Vehicle Inspection",
  "company.videoCard1Text": "Inspection and preparation footage from the export yard.",
  "company.videoCard2Title": "International Export Loading Process",
  "company.videoCard2Text": "Loading and delivery footage from the export dock.",
  "company.ctaTitle": "Ready to source vehicles from China?",
  "company.ctaSubtitle": "Send your vehicle requirements and destination port information. Our export team will prepare a practical sourcing and FOB quotation plan.",
  "company.sendInquiry": "Send Inquiry",  "car.year": "Year"
};

const i18n = {
  en,
  fr: {
    ...en,
    "nav.home": "Accueil",
    "nav.newCars": "Voitures neuves",
    "nav.usedCars": "Voitures d'occasion",
    "nav.brands": "Marques",
    "nav.company": "Entreprise",
    "nav.process": "Processus d'exportation",
    "nav.contact": "Contact",
    "hero.eyebrow": "Approvisionnement direct Expedition mondiale Service fiable",
    "hero.title": "Exportateur fiable de voitures neuves et d'occasion depuis la Chine",
    "hero.subtitle": "Vehicules de qualite, prix competitifs et support export fiable pour les concessionnaires internationaux.",
    "hero.explore": "Voir les vehicules",
    "hero.quote": "Obtenir le prix FOB",
    "hero.statsBrands": "Marques principales",
    "hero.statsSupport": "Support export",
    "hero.statsNetwork": "Reseau d'expedition",
    "brands.eyebrow": "Nos partenaires",
    "brands.title": "Marques automobiles chinoises populaires",
    "brands.subtitle": "Accedez a une large selection de constructeurs reconnus.",
    "new.eyebrow": "Inventaire recent",
    "new.title": "Voitures neuves en vedette",
    "new.subtitle": "Vehicules neufs prets pour la livraison internationale.",
    "used.eyebrow": "Inspecte et verifie",
    "used.pageTitle": "Voitures d'occasion disponibles en Chine",
    "used.pageSubtitle": "Consultez les vehicules avec photos, videos, kilometrage, couleurs et details.",
    "used.title": "Voitures d'occasion en vedette",
    "used.subtitle": "Vehicules selectionnes avec informations de condition transparentes.",
    "used.viewAll": "Voir toutes les occasions",
    "process.eyebrow": "Simple et transparent",
    "process.title": "Notre processus d'exportation",
    "process.subtitle": "De votre premiere demande a la livraison au port de destination.",
    "process.choose": "Choisir un vehicule",
    "process.chooseText": "Indiquez le modele, la quantite et la destination souhaites.",
    "process.confirm": "Confirmer et inspecter",
    "process.confirmText": "Nous confirmons les specifications et fournissons les details d'etat.",
    "process.payment": "Paiement et documents",
    "process.paymentText": "Paiement securise et preparation des documents d'exportation.",
    "process.shipping": "Expedition et livraison",
    "process.shippingText": "Votre vehicule est expedie avec des mises a jour regulieres.",
    "contact.eyebrow": "Commencez votre commande",
    "contact.title": "Vous cherchez un vehicule precis ?",
    "contact.subtitle": "Envoyez vos besoins et recevez une offre export competitive.",
    "contact.whatsapp": "Discuter sur WhatsApp",
    "form.title": "Formulaire de demande",
    "form.name": "Nom",
    "form.country": "Pays",
    "form.whatsapp": "WhatsApp",
    "form.vehicle": "Modele recherche",
    "form.message": "Message",
    "form.submit": "Envoyer la demande",
    "form.success": "Merci, votre demande a ete recue. Notre equipe vous contactera bientot par WhatsApp ou e-mail.",
    "footer.tagline": "Vehicules fiables depuis la Chine, livres dans le monde entier.",
    "footer.rights": "Zhonggu Auto Export. Tous droits reserves.",
    "car.used": "Occasion",
    "car.new": "Neuf",
    "car.available": "Disponible a l'export depuis la Chine avec support FOB",
    "car.fob_price": "Prix FOB",
    "car.ask_fob": "Demander le prix FOB",
    "car.year": "Annee"
  },
  ar: { ...en, "nav.home": "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", "nav.newCars": "\u0633\u064a\u0627\u0631\u0627\u062a \u062c\u062f\u064a\u062f\u0629", "nav.usedCars": "\u0633\u064a\u0627\u0631\u0627\u062a \u0645\u0633\u062a\u0639\u0645\u0644\u0629", "nav.brands": "\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a", "nav.company": "\u0627\u0644\u0634\u0631\u0643\u0629", "nav.process": "\u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u062a\u0635\u062f\u064a\u0631", "nav.contact": "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627" },
  ru: { ...en, "nav.home": "\u0413\u043b\u0430\u0432\u043d\u0430\u044f", "nav.newCars": "\u041d\u043e\u0432\u044b\u0435 \u0430\u0432\u0442\u043e", "nav.usedCars": "\u0410\u0432\u0442\u043e \u0441 \u043f\u0440\u043e\u0431\u0435\u0433\u043e\u043c", "nav.brands": "\u0411\u0440\u0435\u043d\u0434\u044b", "nav.company": "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f", "nav.process": "\u041f\u0440\u043e\u0446\u0435\u0441\u0441 \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0430", "nav.contact": "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b" },  es: { ...en, "nav.home": "Inicio", "nav.newCars": "Autos nuevos", "nav.usedCars": "Autos usados", "nav.brands": "Marcas", "nav.company": "Empresa", "nav.process": "Proceso de exportacion", "nav.contact": "Contacto" }
};


class DataEngine {
  constructor(source = "/cars.json") {
    this.source = source;
    this.rawCars = null;
  }
  async load() {
    if (this.rawCars) return this.getRawCars();
    const response = await fetch(`${this.source}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${this.source}`);
    const data = await response.json();
    const cars = Array.isArray(data) ? data
      : Array.isArray(data?.cars) ? data.cars
      : Array.isArray(data?.vehicles) ? data.vehicles
      : Array.isArray(data?.items) ? data.items
      : [];
    this.rawCars = cars.map((car) => Object.freeze({ ...(car || {}) }));
    console.info("cars.json loaded", { source: this.source, total: this.rawCars.length });
    return this.getRawCars();
  }
  getRawCars() {
    return (this.rawCars || []).map((car) => ({ ...car }));
  }
  normalizeType(car) {
    if (car?.isUsed === true) return "used";
    if (car?.isUsed === false) return "new";
    const values = [car?.category, car?.type, car?.condition, car?.vehicleType, car?.status].map((value) => String(value || "").trim().toLowerCase());
    if (values.some((value) => value === "used" || value === "used car" || value.includes("used"))) return "used";
    if (values.some((value) => value === "new" || value === "new car" || value.includes("new"))) return "new";
    return "new";
  }
  getNewCars() {
    return this.getRawCars().filter((car) => this.normalizeType(car) === "new");
  }
  getUsedCars() {
    return this.getRawCars().filter((car) => this.normalizeType(car) === "used");
  }
}

class CarService {
  constructor(dataEngine) {
    this.dataEngine = dataEngine;
  }
  async init() {
    await this.dataEngine.load();
    return this;
  }
  getFeaturedNewCars(limit = Infinity) {
    return this.dataEngine.getNewCars().slice(0, limit).map((car) => ({ ...car }));
  }
  getFeaturedUsedCars(limit = Infinity) {
    return this.dataEngine.getUsedCars().slice(0, limit).map((car) => ({ ...car }));
  }
  getCarById(id) {
    return this.dataEngine.getRawCars().find((car) => car.id === id) || null;
  }
  getStats() {
    const rawCars = this.dataEngine.getRawCars();
    return { total: rawCars.length, new: this.dataEngine.getNewCars().length, used: this.dataEngine.getUsedCars().length };
  }
}const state = { language: "en", carService: null };
try {
  if (localStorage.getItem("zhonggu-app-version") !== APP_VERSION) localStorage.setItem("zhonggu-app-version", APP_VERSION);
  const savedLanguage = localStorage.getItem("zhonggu-language");
  if (languageOptions.some((item) => item.value === savedLanguage)) state.language = savedLanguage;
} catch {}

if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then((items) => items.forEach((item) => item.unregister())).catch(() => {});
if (window.caches?.keys) caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});

const companyFallbacks = {
  "company.proofPilotTitle": "First-Batch Pilot Enterprise",
  "company.proofPilotText": "One of China's first-batch pilot enterprises for used vehicle export",
  "company.proofTaxTitle": "A-Class Taxpayer",
  "company.proofTaxText": "A-Class taxpayer enterprise with standardized and compliant operations",
  "company.proofRevenueTitle": "USD 100M+",
  "company.proofRevenueText": "Annual vehicle export-related revenue",
  "company.proofNetworkTitle": "Multi-Brand 4S Network",
  "company.proofNetworkText": "Volkswagen, SAIC, FAW, Geely, BYD, GAC and other brand resources",
  "company.kpi4s": "Authorized 4S Partners",
  "company.kpiVehicles": "Vehicles Exported",
  "company.kpiCountries": "Countries Covered",
  "company.kpiCapacityValue": "USD 100M+",
  "company.kpiRevenue": "Annual Export Revenue"
};
const t = (key) => i18n[state.language]?.[key] || i18n.en[key] || companyFallbacks[key] || "";
const localized = (value, fallback = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value[state.language] || value.en || Object.values(value).find(Boolean) || fallback;
  return value || fallback;
};
const versioned = (url) => url ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}` : "";
const cleanPath = (url) => String(url || "").replace(/^\/+/, "");
const vehicleUrl = (id) => `${id || "vehicle"}.html`;
const escapeHtml = (value) => String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const waUrl = (message = "") => `https://wa.me/8618661888866${message ? `?text=${encodeURIComponent(message)}` : ""}`;
const WHATSAPP_CLICK_API = "/api/whatsapp-clicks";
const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeVehicleName = (name, brand = "") => {
  const cleanedName = String(name || "").replace(/\s+/g, " ").trim();
  const cleanedBrand = String(brand || "").replace(/\s+/g, " ").trim();
  if (!cleanedName || !cleanedBrand) return cleanedName;
  const brandPrefix = escapeRegExp(cleanedBrand);
  return cleanedName
    .replace(new RegExp(`^${brandPrefix}\\s+(${brandPrefix}\\S*)`, "i"), "$1")
    .replace(new RegExp(`^(${brandPrefix})\\s+\\1\\b`, "i"), "$1")
    .replace(/\s+/g, " ")
    .trim();
};
const vehicleNameFromParts = (brand, model, year = "") => {
  const cleanedBrand = String(brand || "").replace(/\s+/g, " ").trim();
  const cleanedModel = normalizeVehicleName(model, cleanedBrand);
  const startsWithBrand = cleanedBrand && cleanedModel.toLowerCase().startsWith(cleanedBrand.toLowerCase());
  return [startsWithBrand ? "" : cleanedBrand, cleanedModel, year].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};
const absoluteUrl = (path) => new URL(path || "", window.location.origin).href;
const buildVehicleWhatsappMessage = ({ title, model, year, price, url } = {}) => [
  `I am interested in ${title}. Please send me the latest FOB price and stock list.`,
  title ? `Model: ${title}` : (model ? `Model: ${model}` : ""),
  year ? `Year: ${year}` : "",
  price ? `Price: ${price}` : "",
  url ? `Page: ${url}` : ""
].filter(Boolean).join("\n");
const applyLanguage = () => {
  const meta = languageOptions.find((item) => item.value === state.language) || languageOptions[0];
  document.documentElement.lang = state.language;
  document.documentElement.dir = meta.dir;
  document.querySelectorAll(".language-select").forEach((select) => {
    select.replaceChildren(...languageOptions.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
    select.value = state.language;
  });
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n) || node.textContent; });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => { node.innerHTML = t(node.dataset.i18nHtml) || node.innerHTML; });
  document.querySelectorAll(".main-nav a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const key = href.includes("new-cars") || href === "#new-cars" ? "nav.newCars"
      : href.includes("used-cars") ? "nav.usedCars"
      : href.includes("brands") || href === "#brands" ? "nav.brands"
      : href.includes("company") ? "nav.company"
      : href.includes("export-process") || href.includes("process") || href === "#process" ? "nav.process"
      : href.includes("contact") || href === "#contact" ? "nav.contact"
      : href.includes("index") || href === "#home" || href === "index.html" ? "nav.home"
      : "";
    if (key) link.textContent = t(key);
  });
  document.querySelectorAll(".site-footer p").forEach((node) => {
    const yearNode = node.querySelector("#year");
    if (yearNode) {
      const currentYear = yearNode.textContent || String(new Date().getFullYear());
      node.innerHTML = `&copy; <span id="year">${currentYear}</span> ${escapeHtml(t("footer.rights"))}`;
    } else {
      node.textContent = t("footer.tagline");
    }
  });
  document.querySelectorAll(".inquiry-panel h3").forEach((node) => { node.textContent = t("form.title"); });
  document.querySelectorAll(".inquiry-form [name='name']").forEach((input) => { const label = input.closest("label")?.querySelector("span"); if (label) label.textContent = t("form.name"); });
  document.querySelectorAll(".inquiry-form [name='country']").forEach((input) => { const label = input.closest("label")?.querySelector("span"); if (label) label.textContent = t("form.country"); });
  document.querySelectorAll(".inquiry-form [name='whatsapp']").forEach((input) => { const label = input.closest("label")?.querySelector("span"); if (label) label.textContent = t("form.whatsapp"); });
  document.querySelectorAll(".inquiry-form [name='model']").forEach((input) => { const label = input.closest("label")?.querySelector("span"); if (label) label.textContent = t("form.vehicle"); });
  document.querySelectorAll(".inquiry-form [name='message']").forEach((input) => { const label = input.closest("label")?.querySelector("span"); if (label) label.textContent = t("form.message"); });
  document.querySelectorAll(".inquiry-success").forEach((node) => { node.textContent = t("form.success"); });
  document.querySelectorAll(".js-inquiry-cta, .inquiry-submit").forEach((node) => { node.textContent = node.classList.contains("inquiry-submit") ? t("form.submit") : t("hero.quote"); });
  document.querySelectorAll("a.whatsapp-btn, .hero-actions a[href*='wa.me']").forEach((node) => { node.textContent = t("contact.whatsapp"); });
};
const setLanguage = (language) => {
  if (!languageOptions.some((item) => item.value === language)) return;
  state.language = language;
  try { localStorage.setItem("zhonggu-language", language); } catch {}
  if (!document.body.classList.contains("localized-market-page")) applyLanguage();
  renderVehicleGrids();
};
document.querySelectorAll(".language-select").forEach((select) => select.addEventListener("change", () => setLanguage(select.value)));

const onScroll = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 8 || document.body.classList.contains("used-cars-page") || document.body.classList.contains("company-page") || document.body.classList.contains("seo-page"));
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  mainNav?.classList.toggle("open", !expanded);
});

const brandLogos = [["BYD", "images/brand-logos/byd.svg"], ["Geely", "images/brand-logos/geely.svg"], ["SAIC", "images/brand-logos/saic.svg"], ["FAW", "images/brand-logos/faw.png"], ["GAC", "images/brand-logos/gac.png"], ["Volkswagen", "images/brand-logos/volkswagen.svg"]];
document.querySelectorAll("[data-brand-logo-grid]").forEach((grid) => {
  grid.replaceChildren(...brandLogos.map(([name, src]) => {
    const card = document.createElement("article");
    card.className = "brand-card";
    card.innerHTML = `<img src="${src}" alt="${name} car brand for export from China" loading="lazy"><span>${name}</span>`;
    return card;
  }));
});

const handleImageError = (image) => { image.onerror = null; image.src = "images/hero/hero-car.jpg"; };
const getVehicleTitle = (car = {}) => {
  const brand = localized(car.brand, "");
  const name = localized(car.cardTitle || car.title || car.model) || localized(car.name) || String(car.id || "Vehicle");
  return normalizeVehicleName(name, brand) || vehicleNameFromParts(brand, name) || fallbackVehicleInquiry.formatVehicleName(car);
};
const getVehicleDescription = (car = {}, type = "new") => type === "used" ? "" : (localized(car.shortDescription) || localized(car.description) || localized(car.descriptionShort) || localized(car.configuration) || t("car.available"));
const getVehiclePrice = (car = {}) => localized(car.salePriceDisplay || car.fobPriceDisplay || car.fobNanShaUsd || car.price || car.guidePriceDisplay || car.guidePriceRmb || car.fobRange, "Contact for price");
const getVehicleImage = (car = {}) => cleanPath(localized(car.image || car.mainImage || car.thumbnail || (Array.isArray(car.images) ? car.images[0] : ""), "images/hero/hero-car.jpg"));
const getVehicleSlug = (car = {}) => localized(car.slug || car.id) || vehicleInquiry.vehicleSlug?.(car) || fallbackVehicleInquiry.vehicleSlug(car);
const getVehicleLocation = (car = {}) => localized(car.locationDisplay || car.location, "");
const getInventoryBadge = (car = {}) => localized(car.inventoryBadge || car.supplyMode || (car.isBatchInventory ? "Batch Inventory" : ""), "");
const getVehicleMessage = (car = {}, title = "Vehicle", href = "") => {
  try { return vehicleInquiry.buildVehicleMessage({ ...car, title, detailUrl: absoluteUrl(href) }); }
  catch { return buildVehicleWhatsappMessage({ title, model: title, price: getVehiclePrice(car), url: absoluteUrl(href) }); }
};
const setHiddenFieldValue = (form, name, value = "") => {
  if (!form) return null;
  let input = form.querySelector(`[name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value || "";
  return input;
};
const prefillInventoryInquiry = (form, data = {}) => {
  if (!form) return;
  const title = data.title || data.model || "Vehicle inquiry";
  const modelField = form.elements.namedItem("model");
  const messageField = form.elements.namedItem("message");
  if (modelField) modelField.value = title;
  if (messageField) messageField.value = `Please send current availability, FOB quotation, colors and export timing for ${title}.`;
  setHiddenFieldValue(form, "vehicle_id", data.vehicleId || "");
  setHiddenFieldValue(form, "vehicle_name", title);
  setHiddenFieldValue(form, "model_year", data.year || "");
  setHiddenFieldValue(form, "page_url", data.url ? absoluteUrl(data.url) : window.location.href);
  setHiddenFieldValue(form, "source_url", data.url ? absoluteUrl(data.url) : window.location.href);
  setHiddenFieldValue(form, "lead_source", data.leadSource || "used_car_list");
  setHiddenFieldValue(form, "source", data.leadSource || "used_car_list");
  setHiddenFieldValue(form, "sale_price", data.price || "");
  setHiddenFieldValue(form, "inventory_type", data.inventoryType || "");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.querySelector("input, textarea, select")?.focus({ preventScroll: true });
};

const makeVehicleCard = (car, type = "new") => {
  const brand = localized(car.brand, "Zhonggu Auto Export");
  const model = localized(car.cardTitle || car.model) || localized(car.title) || localized(car.name) || String(car.id || "Vehicle");
  const year = localized(car.year || car.modelYear, "");
  const title = getVehicleTitle(car);
  const displayModel = normalizeVehicleName(model, brand) || title;
  const trim = localized(car.cardSubtitle || car.trimEn || car.configuration || car.transmission, "");
  const transmission = localized(car.transmission || car.fuel, type === "used" ? "" : "New vehicle");
  const mileage = localized(car.mileage, type === "used" ? "" : "New vehicle");
  const price = getVehiclePrice(car);
  const image = getVehicleImage(car);
  const href = `${getVehicleSlug(car)}.html`;
  const video = type === "used" ? cleanPath(localized((car.videos || [])[0], "")) : "";
  const location = getVehicleLocation(car);
  const inventoryBadge = getInventoryBadge(car);
  const inventoryStatus = localized(car.inventoryStatusLabel || car.inventoryStatusDisplay || car.inventoryStatus, "");
  const message = getVehicleMessage(car, title, href);
  const meta = type === "used"
    ? [year && `${t("car.year")}: ${year}`, mileage, location].filter(Boolean).join(" | ")
    : [year && `${t("car.year")}: ${year}`, location || transmission].filter(Boolean).join(" | ");
  const inventoryTags = type === "used"
    ? [inventoryBadge]
    : [inventoryBadge, inventoryStatus].filter((item) => !/ample stock|contact us/i.test(item));
  const tagMarkup = inventoryTags.filter(Boolean).length ? `<div class="vehicle-tags">${inventoryTags.filter(Boolean).map((item) => `<span class="vehicle-tag">${escapeHtml(item)}</span>`).join("")}</div>` : "";
  const description = getVehicleDescription(car, type);
  const quoteAttrs = `data-title="${escapeHtml(title)}" data-model="${escapeHtml(displayModel)}" data-year="${escapeHtml(year)}" data-price="${escapeHtml(price)}" data-url="${escapeHtml(href)}" data-vehicle-id="${escapeHtml(car.id || "")}" data-lead-source="${type === "used" ? "used_car_list" : "vehicle_card"}" data-inventory-type="${escapeHtml(car.isBatchInventory ? "batch_inventory" : "")}"`;
  const card = document.createElement("article");
  card.className = "vehicle-card";
  card.innerHTML = `
    <a class="vehicle-image" href="${href}" aria-label="View ${escapeHtml(title)}">
      <img src="${image}" alt="${escapeHtml(title)} ${type === "used" ? "used car" : "new car"} for export from China" loading="lazy">
      <span class="vehicle-badge">${escapeHtml(type === "used" ? t("car.used") : t("car.new"))}</span>
    </a>
    <div class="vehicle-body">
      <p class="vehicle-brand">${escapeHtml(brand)}</p>
      <h3><a href="${href}">${escapeHtml(displayModel)}</a></h3>
      <p class="vehicle-subtitle">${escapeHtml(trim)}</p>
      <p class="vehicle-meta">${escapeHtml(meta)}</p>
      ${tagMarkup}
      ${description ? `<p class="vehicle-description">${escapeHtml(description)}</p>` : ""}
      ${type === "used" ? `<div class="vehicle-media-actions"><a class="media-action-btn" href="${href}">View Details</a>${video ? `<a class="media-action-btn media-action-video" href="${video}" target="_blank" rel="noopener">Play Video</a>` : ""}</div>` : ""}
    </div>
    <div class="vehicle-footer"><div class="price"><small>${escapeHtml(type === "used" ? "Sale Price" : t("car.fob_price"))}</small><strong>${escapeHtml(price)}</strong></div><a class="vehicle-fob-btn js-inquiry-cta" href="#contact" ${quoteAttrs}>Request FOB Quote</a></div>
  `;
  const img = card.querySelector("img");
  img.addEventListener("error", () => handleImageError(img));
  const quote = card.querySelector(".vehicle-fob-btn");
  quote.dataset.message = message;
  quote.addEventListener("click", (event) => {
    event.preventDefault();
    prefillInventoryInquiry(document.querySelector(".inquiry-form"), {
      title,
      model: displayModel,
      year,
      price,
      url: href,
      vehicleId: car.id || "",
      leadSource: type === "used" ? "used_car_list" : "vehicle_card",
      inventoryType: car.isBatchInventory ? "batch_inventory" : ""
    });
  });
  return card;
};
const fetchJson = async (url) => {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
};
const vehicleGridKind = (grid) => {
  const explicit = String(grid.dataset.vehicleGrid || grid.dataset.carGrid || "").toLowerCase();
  if (explicit.includes("used")) return "used";
  if (explicit.includes("new") || explicit.includes("featured")) return "new";
  if (grid.dataset.usedCarsLimit !== undefined) return "used";
  if (grid.dataset.newCarsLimit !== undefined) return "new";
  const text = [grid.id, grid.className, grid.closest("section")?.id, grid.closest("section")?.className, document.body.className].join(" ").toLowerCase();
  if (text.includes("used")) return "used";
  return "new";
};
const vehicleGrids = (type) => {
  const selectors = ["#featured-cars", "#featured-new-cars", "#new-cars-grid", "#used-cars-grid", ".vehicle-grid", "[data-vehicle-grid]", "[data-car-grid]"];
  const grids = [...new Set(selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))))].filter((grid) => vehicleGridKind(grid) === type);
  console.info(grids.length ? "render container found" : "render container not found", { type, count: grids.length });
  return grids;
};
const vehicleEmptyState = (message, isError = false) => {
  const node = document.createElement("p");
  node.className = isError ? "vehicle-empty-state vehicle-load-error" : "vehicle-empty-state";
  node.textContent = message;
  return node;
};
const renderCarsIntoGrid = (grid, cars, type) => {
  try {
    const cards = cars.map((car) => {
      try { return makeVehicleCard(car, type); }
      catch (error) { console.warn("Vehicle card render skipped", { type, id: car?.id, error }); return null; }
    }).filter(Boolean);
    if (!cards.length) {
      const message = type === "used"
        ? "Current used car stock list is being updated. Please send your requirements and our team will check available stock."
        : "Current new car stock list is being updated. Please send an inquiry for the latest available vehicles.";
      grid.replaceChildren(vehicleEmptyState(message));
      return;
    }
    grid.replaceChildren(...cards);
  } catch (error) {
    console.error("Vehicle grid render failed", { type, error });
    grid.replaceChildren(vehicleEmptyState("Unable to load vehicle inventory. Please contact us for the latest stock list.", true));
  }
};
const showVehicleLoadError = () => {
  [...vehicleGrids("new"), ...vehicleGrids("used")].forEach((grid) => {
    grid.replaceChildren(vehicleEmptyState("Unable to load vehicle inventory. Please contact us for the latest stock list.", true));
  });
};
const renderVehicleGrids = () => {
  if (!state.carService) return;
  const newCars = state.carService.getFeaturedNewCars(Infinity);
  const usedCars = state.carService.getFeaturedUsedCars(Infinity);
  vehicleGrids("new").forEach((grid) => {
    const rawLimit = grid.dataset.newCarsLimit || "all";
    const limit = rawLimit === "all" ? Infinity : Number(rawLimit);
    renderCarsIntoGrid(grid, newCars.slice(0, Number.isFinite(limit) ? limit : Infinity), "new");
  });
  vehicleGrids("used").forEach((grid) => {
    const rawLimit = grid.dataset.usedCarsLimit || "all";
    const limit = rawLimit === "all" ? Infinity : Number(rawLimit);
    renderCarsIntoGrid(grid, usedCars.slice(0, Number.isFinite(limit) ? limit : Infinity), "used");
  });
};
const loadVehicles = async () => {
  try {
    state.carService = await new CarService(new DataEngine()).init();
    const stats = state.carService.getStats();
    console.info("total cars count", stats.total);
    console.info("new cars count", stats.new);
    console.info("used cars count", stats.used);
    renderVehicleGrids();
  } catch (error) {
    console.error("Unable to load vehicle inventory", error);
    showVehicleLoadError();
  }
};

const trackWhatsappClickToCrm = (target) => {
  if (!target) return;
  const payload = {
    eventType: "whatsapp_click",
    source: "whatsapp_click",
    sourceType: "whatsapp_click",
    pageUrl: window.location.href,
    page: window.location.pathname + window.location.search,
    sourcePage: window.location.pathname || "/",
    sourceUrl: window.location.href,
    sourceButton: String(target.textContent || target.getAttribute("aria-label") || "WhatsApp button").trim(),
    buttonText: String(target.textContent || target.getAttribute("aria-label") || "WhatsApp button").trim(),
    vehicle: target.dataset.vehicle || target.dataset.model || target.dataset.car || document.body.dataset.vehicleName || document.querySelector("h1")?.textContent || "Vehicles from Zhonggu Auto Export",
    market: target.dataset.market || document.body.dataset.marketCountry || document.body.dataset.marketRegion || "",
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent || ""
  };
  const summary = { api: WHATSAPP_CLICK_API, vehicle: payload.vehicle, page: payload.pageUrl };
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const queued = navigator.sendBeacon(WHATSAPP_CLICK_API, new Blob([body], { type: "application/json" }));
      if (queued) {
        console.info("Zhonggu WhatsApp click tracked", { ...summary, queued: true });
        return;
      }
      console.warn("Zhonggu WhatsApp tracking failed", { ...summary, error: "sendBeacon not queued" });
    }
    fetch(WHATSAPP_CLICK_API, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
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
const bindWhatsappButtons = () => {
  document.querySelectorAll("a[href='#contact-whatsapp'], [data-whatsapp-button='true'], .whatsapp-btn").forEach((button) => {
    const label = `Contact Zhonggu Auto Export through ${whatsappDisplayNumber}`;
    button.title = whatsappDisplayNumber;
    button.setAttribute("aria-label", label);
  });
  document.addEventListener("click", (event) => {
    const whatsappTarget = event.target.closest("a[href='#contact-whatsapp'], [data-whatsapp-button='true'], .whatsapp-btn");
    if (whatsappTarget) {
      window.trackEvent("whatsapp_click", { link_url: whatsappTarget.href || waUrl(whatsappTarget.dataset.message || "Website inquiry") });
      trackWhatsappClickToCrm(whatsappTarget);
    }
    const button = event.target.closest(".whatsapp-btn, .vehicle-card button");
    if (!button || button.tagName === "A") return;
    const message = button.dataset.message || `Hello Zhonggu Auto Export, I would like to request FOB price and stock list for ${button.dataset.car || "a vehicle"}.`;
    button.dataset.whatsappButton = "true";
    button.dataset.whatsappMessage = encodeURIComponent(message);
    if (window.ZhongguWhatsappLeadModal?.open) {
      window.ZhongguWhatsappLeadModal.open({
        vehicle: button.dataset.car || button.dataset.model || "Vehicle inquiry",
        sourceButton: button.textContent || "WhatsApp button",
        sourcePage: window.location.pathname || "/",
        sourceUrl: window.location.href
      });
    } else {
      window.location.href = waUrl(message);
    }
  });
};
const updateCompanyMedia = async () => {
  if (!document.body.classList.contains("company-page")) return;
  try {
    const config = window.ZHONGGU_PUBLIC_MEDIA_CONFIG;
    if (!config) return;
    Object.entries(config.strengthImages || {}).forEach(([slot, entry]) => {
      const card = document.querySelector(`[data-media-slot="${slot}"]`);
      const img = card?.querySelector("[data-media-image]");
      if (!img || !entry.active) return;
      img.src = versioned(entry.active);
      img.alt = `Zhonggu Auto Export ${entry.title || "company media"}`;
      const title = card.querySelector("[data-media-title]");
      if (title && entry.title) title.textContent = entry.title;
    });
    Object.entries(config.companyVideos || {}).forEach(([slot, entry]) => {
      const card = document.querySelector(`[data-video-slot="${slot}"]`);
      const video = card?.querySelector("[data-media-video]");
      if (!video || !entry.active) return;
      video.src = versioned(entry.active);
      if (entry.poster) video.poster = versioned(entry.poster);
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      const title = card.querySelector("[data-media-title]");
      const subtitle = card.querySelector("[data-media-subtitle]");
      if (title && entry.title) title.textContent = entry.title;
      if (subtitle && entry.subtitle) subtitle.textContent = entry.subtitle;
    });
  } catch (error) { console.info("Using static company media fallback"); }
};
const bindVideoStages = () => {
  document.querySelectorAll(".video-stage").forEach((stage) => {
    const video = stage.querySelector("video");
    if (!video) return;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    stage.addEventListener("click", (event) => { if (!event.target.closest("video")) video.play().catch(() => {}); });
  });
};
const selectVehicleGalleryImage = (gallery, button) => {
  if (!gallery || !button) return;
  const main = gallery.querySelector("[data-gallery-main]");
  const nextSrc = button.dataset.gallerySrc || "";
  if (!main || !nextSrc) return;
  main.removeAttribute("srcset");
  main.removeAttribute("sizes");
  main.src = nextSrc;
  main.setAttribute("src", nextSrc);
  main.alt = button.dataset.galleryAlt || button.querySelector("img")?.alt || main.alt;
  gallery.querySelectorAll("[data-gallery-src]").forEach((item) => {
    const selected = item === button;
    item.setAttribute("aria-current", selected ? "true" : "false");
    item.setAttribute("aria-selected", selected ? "true" : "false");
    item.classList.toggle("is-active", selected);
  });
};
const initVehicleGalleries = () => {
  document.querySelectorAll("[data-vehicle-gallery]").forEach((gallery) => {
    if (gallery.dataset.galleryBound === "true") return;
    gallery.dataset.galleryBound = "true";
    const buttons = Array.from(gallery.querySelectorAll("[data-gallery-src]"));
    buttons.forEach((button) => {
      if (button.tagName === "BUTTON" && !button.getAttribute("type")) button.setAttribute("type", "button");
      const selected = button.getAttribute("aria-current") === "true" || button.classList.contains("is-active");
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.classList.toggle("is-active", selected);
    });
    gallery.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gallery-src]");
      if (!button || !gallery.contains(button)) return;
      event.preventDefault();
      selectVehicleGalleryImage(gallery, button);
    });
    gallery.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const button = event.target.closest("[data-gallery-src]");
      if (!button || !gallery.contains(button)) return;
      event.preventDefault();
      selectVehicleGalleryImage(gallery, button);
    });
  });
};

const encodeFormData = (formData) => new URLSearchParams(formData).toString();
const INQUIRY_API = "/api/public/inquiries";
const formDataValue = (formData, ...names) => names.map((name) => String(formData.get(name) || "").trim()).find(Boolean) || "";
const callingCodeChoices = [
  ["+213", "Algeria (+213)"],
  ["+7", "Russia / Kazakhstan (+7)"],
  ["+966", "Saudi Arabia (+966)"],
  ["+971", "United Arab Emirates (+971)"],
  ["+226", "Burkina Faso (+226)"],
  ["+86", "China (+86)"],
  ["+20", "Egypt (+20)"],
  ["+234", "Nigeria (+234)"],
  ["+254", "Kenya (+254)"],
  ["+255", "Tanzania (+255)"],
  ["+233", "Ghana (+233)"],
  ["+998", "Uzbekistan (+998)"]
];
const normalizeCallingCode = (value = "") => {
  const cleaned = String(value || "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
};
const normalizePhoneNumber = (value = "") => String(value || "").replace(/[^\d]/g, "");
const buildInternationalWhatsapp = (formData) => {
  const direct = formDataValue(formData, "whatsapp", "phone", "mobile", "tel");
  const callingCode = normalizeCallingCode(formDataValue(formData, "calling_code", "country_code", "dial_code"));
  const phoneNumber = normalizePhoneNumber(formDataValue(formData, "phone_number", "national_phone", "whatsapp_number"));
  if (callingCode && phoneNumber) return callingCode + phoneNumber;
  if (direct && /^\+/.test(direct)) return "+" + normalizePhoneNumber(direct);
  return normalizePhoneNumber(direct);
};
const buildInquiryPayload = (form, formData) => {
  const sourceUrl = formDataValue(formData, "source_url", "pageUrl") || window.location.href;
  const sourcePage = formDataValue(formData, "source_page", "sourcePage") || document.querySelector("h1")?.textContent || document.title || window.location.pathname;
  const vehicle = formDataValue(formData, "vehicle", "car_type", "interestedModel", "model", "car") || sourcePage;
  const port = formDataValue(formData, "destinationPort", "port", "destination_port", "destination");
  const budget = formDataValue(formData, "budget", "budgetPerUnit", "budget_per_unit", "totalBudget", "total_budget");
  const callingCode = normalizeCallingCode(formDataValue(formData, "calling_code", "country_code", "dial_code"));
  const phoneNumber = normalizePhoneNumber(formDataValue(formData, "phone_number", "national_phone", "whatsapp_number"));
  const whatsapp = buildInternationalWhatsapp(formData);
  return {
    name: formDataValue(formData, "name", "fullName", "contact_name"),
    country: formDataValue(formData, "country", "market_country"),
    port,
    destinationPort: port,
    vehicle,
    interestedModel: vehicle,
    budget,
    whatsapp,
    callingCode,
    phoneNumber,
    email: formDataValue(formData, "email", "mail", "customerEmail"),
    message: formDataValue(formData, "message", "requirements", "comments"),
    source: formDataValue(formData, "lead_source", "source", "sourceType", "source_type") || "website_form",
    leadSource: formDataValue(formData, "lead_source"),
    vehicleId: formDataValue(formData, "vehicle_id"),
    vehicleName: formDataValue(formData, "vehicle_name"),
    modelYear: formDataValue(formData, "model_year"),
    salePrice: formDataValue(formData, "sale_price"),
    inventoryType: formDataValue(formData, "inventory_type"),
    pageUrl: formDataValue(formData, "page_url") || sourceUrl,
    sourceDetail: "Website Inquiry Form",
    sourceChannel: "inquiry_form",
    sourceEntry: form.dataset.sourceEntry || formDataValue(formData, "source_entry") || "inquiry_form",
    sourcePage,
    sourceUrl,
    assignedTo: formDataValue(formData, "assignedTo", "assigned_to"),
    status: "new",
    createdAt: new Date().toISOString(),
    language: formDataValue(formData, "language") || document.documentElement.lang || "en",
    market: formDataValue(formData, "market", "market_region", "market_country"),
    referrer: document.referrer || ""
  };
};
const submitInquiryToCrm = async (payload) => {
  const summary = {
    api: INQUIRY_API,
    source: payload.source || "website_form",
    vehicle: payload.vehicle || payload.interestedModel || "",
    page: payload.sourceUrl || window.location.href
  };
  console.info("Zhonggu CRM submit start", summary);
  console.info("submitting inquiry", summary);
  const response = await fetch(INQUIRY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let result = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }
  const apiStatus = { status: response.status, ok: response.ok, stored: result.stored, id: result.id, source: result.source, storage: result.storage };
  console.info("Zhonggu CRM API response", apiStatus);
  console.info("inquiry api status", apiStatus);
  if (!response.ok || result.success === false || result.ok === false || result.stored !== true) {
    console.warn("inquiry save failed", { ...apiStatus, error: result.error || result.message || "CRM save failed" });
    throw new Error(result.error || result.message || "CRM save failed with status " + response.status);
  }
  console.info("inquiry saved ok", apiStatus);
  return result;
};

const ensureHiddenField = (form, name, value = "") => {
  let input = form.querySelector(`[name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  if (value && !input.value) input.value = value;
  return input;
};

const createOptionalInquiryField = (name, labelText, options = {}) => {
  const label = document.createElement("label");
  if (options.wide) label.className = "field-wide";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = options.type || "text";
  input.name = name;
  if (options.autocomplete) input.autocomplete = options.autocomplete;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.inputMode) input.inputMode = options.inputMode;
  label.append(span, input);
  return label;
};
const createCallingCodeField = () => {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = "WhatsApp Country Code";
  const select = document.createElement("select");
  select.name = "calling_code";
  select.autocomplete = "tel-country-code";
  select.required = true;
  select.append(new Option("Select code", ""));
  callingCodeChoices.forEach(([value, labelText]) => select.append(new Option(labelText, value)));
  label.append(span, select);
  return label;
};

const createPhoneNumberField = () => {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = "WhatsApp Number";
  const input = document.createElement("input");
  input.type = "tel";
  input.name = "phone_number";
  input.autocomplete = "tel-national";
  input.inputMode = "tel";
  input.pattern = "[0-9 ()-]{5,20}";
  input.placeholder = "Number without +";
  input.required = true;
  label.append(span, input);
  return label;
};

const ensureWhatsappPhoneFields = (form, fields) => {
  const hasCallingCode = form.querySelector('[name="calling_code"]');
  const hasPhoneNumber = form.querySelector('[name="phone_number"]');
  const whatsappInput = form.querySelector('[name="whatsapp"]');
  if (!hasCallingCode || !hasPhoneNumber) {
    const phoneLabel = whatsappInput?.closest("label");
    const replacement = [createCallingCodeField(), createPhoneNumberField()];
    if (phoneLabel) phoneLabel.replaceWith(...replacement);
    else {
      const messageLabel = fields.querySelector('[name="message"]')?.closest("label");
      fields.insertBefore(replacement[0], messageLabel || null);
      fields.insertBefore(replacement[1], messageLabel || null);
    }
  }
  const hiddenWhatsapp = ensureHiddenField(form, "whatsapp");
  hiddenWhatsapp.autocomplete = "tel";
};

const insertInquiryField = (fields, node) => {
  const messageLabel = fields.querySelector('[name="message"]')?.closest("label");
  fields.insertBefore(node, messageLabel || null);
};

const syncVehicleAliasFields = (form) => {
  const vehicleInput = form.querySelector('[name="vehicle"], [name="car_type"], [name="interestedModel"], [name="model"], [name="car"]');
  const carTypeInput = ensureHiddenField(form, "car_type");
  const sync = () => {
    if (vehicleInput?.value) carTypeInput.value = vehicleInput.value;
  };
  vehicleInput?.addEventListener("input", sync);
  vehicleInput?.addEventListener("change", sync);
  sync();
};

const ensureInquiryFormFields = () => {
  document.querySelectorAll("form.inquiry-form").forEach((form) => {
    const fields = form.querySelector(".inquiry-fields") || form;
    const emailInput = form.querySelector('[name="email"]');
    if (emailInput) {
      emailInput.required = false;
      emailInput.removeAttribute("required");
    } else {
      insertInquiryField(fields, createOptionalInquiryField("email", "Email (optional)", { type: "email", autocomplete: "email" }));
    }
    if (!form.querySelector('[name="destinationPort"], [name="port"]')) {
      insertInquiryField(fields, createOptionalInquiryField("destinationPort", "Destination Port (optional)", { autocomplete: "off" }));
    }
    const budgetInput = form.querySelector('[name="budget"]');
    if (budgetInput) {
      budgetInput.required = false;
      budgetInput.removeAttribute("required");
    } else {
      insertInquiryField(fields, createOptionalInquiryField("budget", "Budget (optional)", { placeholder: "USD or RMB", inputMode: "decimal" }));
    }
    ensureHiddenField(form, "source", form.dataset.sourceEntry || "website_form");
    ensureHiddenField(form, "lead_source", form.dataset.sourceEntry || "website_form");
    ensureHiddenField(form, "vehicle_id");
    ensureHiddenField(form, "vehicle_name");
    ensureHiddenField(form, "model_year");
    ensureHiddenField(form, "page_url");
    ensureHiddenField(form, "sale_price");
    ensureHiddenField(form, "inventory_type");
    ensureHiddenField(form, "createdAt");
    ensureWhatsappPhoneFields(form, fields);
    syncVehicleAliasFields(form);
  });
};

const applyInquiryFieldMappings = (formData) => {
  const vehicle = formDataValue(formData, "vehicle", "car_type", "interestedModel", "model", "car");
  if (vehicle) {
    formData.set("vehicle", vehicle);
    formData.set("car_type", vehicle);
    formData.set("interestedModel", vehicle);
  }
  const destinationPort = formDataValue(formData, "destinationPort", "port", "destination_port", "destination");
  if (destinationPort) {
    formData.set("destinationPort", destinationPort);
    formData.set("port", destinationPort);
  }
  formData.set("email", formDataValue(formData, "email", "mail", "customerEmail"));
  formData.set("budget", formDataValue(formData, "budget", "budgetPerUnit", "budget_per_unit", "totalBudget", "total_budget"));
  const callingCode = normalizeCallingCode(formDataValue(formData, "calling_code", "country_code", "dial_code"));
  const phoneNumber = normalizePhoneNumber(formDataValue(formData, "phone_number", "national_phone", "whatsapp_number"));
  if (callingCode) formData.set("calling_code", callingCode);
  if (phoneNumber) formData.set("phone_number", phoneNumber);
  const whatsapp = buildInternationalWhatsapp(formData);
  if (whatsapp) formData.set("whatsapp", whatsapp);
  formData.set("source", formDataValue(formData, "lead_source", "source", "sourceType", "source_type") || "website_form");
  formData.set("lead_source", formDataValue(formData, "lead_source") || formDataValue(formData, "source") || "website_form");
  formData.set("page_url", formDataValue(formData, "page_url", "source_url") || window.location.href);
  formData.set("createdAt", formDataValue(formData, "createdAt", "created_at") || new Date().toISOString());
};

const bindAfricaMarketTracking = () => {
  if (!document.body.classList.contains("africa-market-page")) return;
  const country = document.body.dataset.marketCountry || "Africa";
  window.trackEvent("africa_market_page_view", { country, page_location: window.location.href });
  document.querySelectorAll(".africa-inquiry-cta").forEach((button) => {
    button.addEventListener("click", () => {
      window.trackEvent("africa_inquiry_click", { country, link_url: button.href });
    });
  });
};
const bindInquiryForms = () => {
  document.querySelectorAll("form.inquiry-form").forEach((form) => {
    if (form.dataset.submitBound === "true") return;
    form.dataset.submitBound = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = form.querySelector('[type="submit"]');
      const originalLabel = submitButton?.textContent;
      const formData = new FormData(form);
      formData.set("form-name", "inquiry");
      applyInquiryFieldMappings(formData);

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      try {
        const crmPayload = buildInquiryPayload(form, formData);
        try {
          await submitInquiryToCrm(crmPayload);
        } catch (crmError) {
          console.warn("Zhonggu inquiry save failed; continuing with Netlify form fallback", { error: crmError.message });
        }
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encodeFormData(formData)
        });
        if (!response.ok) throw new Error(`Submission failed with status ${response.status}`);
        window.location.assign("/thank-you.html");
      } catch (error) {
        console.error("Inquiry submission failed", error);
        window.alert("Submission failed. Please try again or contact our sales team.");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });
  });
};
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
if (!document.body.classList.contains("localized-market-page")) applyLanguage();
loadVehicles().catch((error) => console.error("Vehicle data engine failed", error));
bindWhatsappButtons();
updateCompanyMedia();
bindVideoStages();
initVehicleGalleries();
ensureInquiryFormFields();
bindInquiryForms();
bindAfricaMarketTracking();
if (document.body.classList.contains("company-page")) window.setInterval(updateCompanyMedia, 15000);
