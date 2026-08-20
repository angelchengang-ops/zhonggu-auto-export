const assert = require("assert");
const { buildDailyReport } = require("../netlify/functions/crm-store");

const now = "2026-08-20T08:00:00.000Z";
const report = buildDailyReport([
  { id:"INQ-1", createdAt:"2026-08-20T07:00:00.000Z", source:"website_form", status:"new", country:"Algeria", vehicle:"Geely Coolray", message:"FOB price and stock", assignedTo:"" },
  { id:"WA-1", createdAt:"2026-08-20T06:00:00.000Z", source:"whatsapp_click", sourceType:"whatsapp_click", status:"whatsapp_click" },
  { id:"INQ-2", createdAt:"2026-08-18T07:00:00.000Z", source:"manual", status:"assigned", country:"Ghana", vehicle:"Bestune B70", assignedTo:"sales_zheng", whatsapp:"233000000000" },
  { id:"INQ-3", createdAt:"2026-08-19T07:00:00.000Z", source:"website_form", status:"contacted", country:"Ghana", vehicle:"Bestune B70", assignedTo:"sales_zheng", whatsapp:"233000000000" }
], { now });

assert.equal(report.summary.newLeads24h, 1);
assert.equal(report.summary.whatsappClicks24h, 1);
assert.equal(report.summary.unassigned24h, 1);
assert.equal(report.summary.overdueFirstFollowUp, 1);
assert.equal(report.summary.duplicateContactGroups, 1);
assert.equal(report.countries24h.Algeria, 1);
assert.equal(report.priorityLeads[0].id, "INQ-1");
assert.equal(report.priorityLeads[0].whatsapp, undefined);
console.log("CRM daily report tests passed.");
