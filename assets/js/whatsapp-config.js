(() => {
  const MODAL_SCRIPT = "/assets/js/whatsapp-lead-modal.js?v=6a12df942927";
  const MODAL_STYLE = "/assets/css/whatsapp-lead-modal.css";
  const loadStyle = () => {
    if (document.querySelector(`link[href="${MODAL_STYLE}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MODAL_STYLE;
    document.head.appendChild(link);
  };
  const loadModal = () => new Promise((resolve) => {
    loadStyle();
    if (window.ZhongguWhatsappLeadModal?.attach) return resolve(window.ZhongguWhatsappLeadModal);
    const existing = document.querySelector('script[data-whatsapp-lead-modal]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.ZhongguWhatsappLeadModal || null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = MODAL_SCRIPT;
    script.defer = true;
    script.dataset.whatsappLeadModal = "true";
    script.onload = () => resolve(window.ZhongguWhatsappLeadModal || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  async function buildWhatsappLink(options = {}) {
    const params = new URLSearchParams();
    Object.entries(options || {}).forEach(([key, value]) => {
      const clean = String(value || "").trim();
      if (clean) params.set(key, clean);
    });
    const response = await fetch(`/api/public/whatsapp-link?${params.toString()}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false || !data.url) throw new Error(data.error || "Unable to build WhatsApp link");
    return data;
  }
  async function attachWhatsappButtons(root = document) {
    const modal = await loadModal();
    modal?.attach?.(root);
    return modal;
  }
  window.ZhongguWhatsapp = { buildWhatsappLink, attachWhatsappButtons, loadModal };
  window.buildWhatsappLink = buildWhatsappLink;
  window.attachWhatsappButtons = attachWhatsappButtons;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => attachWhatsappButtons(), { once: true });
  else attachWhatsappButtons();
})();
