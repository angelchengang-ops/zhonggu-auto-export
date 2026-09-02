const { assignedName, createLead, filterLeads, readLeads, toCsv, updateLead } = require("./crm-store");
const { json, requireAdmin } = require("./admin-session");

const parseBody = (event) => {
  const raw = event.body || "";
  if (!raw) return {};
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  if (contentType.includes("application/json") || raw.trim().startsWith("{") || raw.trim().startsWith("[")) return JSON.parse(raw);
  return Object.fromEntries(new URLSearchParams(raw).entries());
};

const csvResponse = (body) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Disposition": "attachment; filename=\"inquiries.csv\""
  },
  body
});

const partsAfterInquiries = (path = "") => {
  const marker = "/api/admin/inquiries";
  const rest = String(path || "").split("?")[0].slice(marker.length).replace(/^\//, "");
  return rest ? rest.split("/").map(decodeURIComponent) : [];
};

const whatsappUrl = (lead) => {
  const number = String(lead.whatsapp || lead.rawWhatsapp || "").replace(/\D/g, "");
  if (!number) return "";
  const text = encodeURIComponent(`Hello ${lead.name || ""}, this is Zhonggu Auto Export. We received your inquiry about ${lead.vehicle || lead.interestedModel || "vehicles"}.`);
  return `https://wa.me/${number}?text=${text}`;
};

exports.handler = async (event) => {
  try {
  const user = requireAdmin(event);
  if (user.statusCode) return user;

  const url = new URL(event.rawUrl || `https://zhongguauto.com${event.path || "/api/admin/inquiries"}`);
  const path = url.pathname;
  const parts = partsAfterInquiries(path);

  if (event.httpMethod === "GET") {
    const { items, formsImport } = await readLeads({ syncForms: url.searchParams.get("is_test") !== "true" });
    const filtered = filterLeads(items, url.searchParams);
    if (path.endsWith("/export.csv")) return csvResponse(toCsv(filtered.filter(item => !item.is_test)));
    if (parts.length && parts[0] !== "export.csv") {
      const inquiry = items.find((item) => item.id === parts[0]) || null;
      return inquiry
        ? json(200, { ok: true, success: true, inquiry, item: inquiry })
        : json(404, { ok: false, success: false, message: "Inquiry not found" });
    }
    return json(200, { ok: true, success: true, inquiries: filtered, items: filtered, total: filtered.length, formsImport });
  }

  if (event.httpMethod === "POST" && parts.length === 0) {
    const body = parseBody(event);
    if (body.is_test || body.isTest || body.test_id || body.testId) return json(403, { ok: false, error: "Use the authenticated isolated test channel" });
    const saved = await createLead({ ...body, source: "manual", sourceType: "manual", assignedTo: body.assignedTo || "" }, event, { kind: "manual" });
    return json(200, { ok: true, success: true, inquiry: saved.lead, item: saved.lead });
  }

  if (event.httpMethod === "PATCH" && parts.length === 0) {
    const body = parseBody(event);
    const id = body.id || body.leadId || body.lead_id;
    if (!id) return json(400, { ok: false, success: false, message: "id is required" });
    const updated = await updateLead(id, body, user);
    if (!updated) return json(404, { ok: false, success: false, message: "Inquiry not found" });
    return json(200, { ok: true, success: true, inquiry: updated, item: updated, assignedName: assignedName(updated.assignedTo) });
  }

  if ((event.httpMethod === "PATCH" || event.httpMethod === "POST") && parts.length >= 1) {
    const id = parts[0];
    const action = parts[1] || "";
    const body = parseBody(event);
    if (action === "contact-whatsapp") {
      const updated = await updateLead(id, { status: "contacted", note: "Opened WhatsApp contact from CRM." }, user);
      if (!updated) return json(404, { ok: false, success: false, message: "Inquiry not found" });
      return json(200, { ok: true, success: true, inquiry: updated, item: updated, url: whatsappUrl(updated) });
    }
    const patch = action === "assign" ? { assignedTo: body.assignedTo ?? body.userId ?? body.salesId ?? "" }
      : action === "status" ? { status: body.status }
      : action === "note" ? { note: body.note }
      : body;
    const updated = await updateLead(id, patch, user);
    if (!updated) return json(404, { ok: false, success: false, message: "Inquiry not found" });
    return json(200, { ok: true, success: true, inquiry: updated, item: updated, assignedName: assignedName(updated.assignedTo) });
  }

  return json(405, { ok: false, success: false, message: "Method not allowed" });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, success: false, message: error.message });
  }
};
