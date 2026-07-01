(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZhongguVehicleInquiry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SITE_URL = "https://www.zhongguauto.com";
  const WHATSAPP_NUMBER = "447473271351";

  const text = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return text(value.en || Object.values(value).find(Boolean));
    }
    return String(value || "").replace(/\s+/g, " ").trim();
  };

  const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const formatVehicleName = (car = {}) => {
    const brand = text(car.brand);
    let name = text(car.title || car.name || car.model);
    if (!name) return brand;
    if (!brand) return name;
    const duplicateBrand = new RegExp(`^${escapeRegExp(brand)}\\s+${escapeRegExp(brand)}\\b`, "i");
    while (duplicateBrand.test(name)) name = name.replace(duplicateBrand, brand);
    return new RegExp(`^${escapeRegExp(brand)}\\b`, "i").test(name) ? name : `${brand} ${name}`;
  };

  const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const vehicleSlug = (car = {}) => text(car.id || car.slug) || slugify(formatVehicleName(car));
  const vehicleDetailUrl = (car = {}) => `${SITE_URL}/${vehicleSlug(car)}.html`;

  const buildVehicleMessage = (car = {}) => {
    const vehicleName = formatVehicleName(car);
    const year = text(car.year || car.modelYear);
    const price = text(car.price || car.fobPriceDisplay || car.fobNanShaUsd || car.fobRange);
    const url = text(car.detailUrl || car.url) || vehicleDetailUrl(car);
    return [
      `I am interested in ${vehicleName}. Please send me the latest FOB price and stock list.`,
      `Model: ${vehicleName}`,
      year ? `Year: ${year}` : "",
      price ? `Price: ${price}` : "",
      `Page: ${url}`
    ].filter(Boolean).join("\n");
  };

  const buildVehicleWhatsappUrl = (car = {}) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildVehicleMessage(car))}`;

  return { SITE_URL, WHATSAPP_NUMBER, formatVehicleName, vehicleSlug, vehicleDetailUrl, buildVehicleMessage, buildVehicleWhatsappUrl };
});