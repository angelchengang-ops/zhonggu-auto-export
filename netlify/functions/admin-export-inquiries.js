const { filterLeads, readLeads, toCsv } = require("./crm-store");
const { requireAdmin } = require("./admin-session");

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  const url = new URL(event.rawUrl || `https://zhongguauto.com${event.path || "/api/admin/inquiries/export.csv"}`);
  const { items } = await readLeads({ syncForms: true });
  const filtered = filterLeads(items, url.searchParams);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=\"inquiries.csv\""
    },
    body: toCsv(filtered.filter(item => !item.is_test))
  };
};
