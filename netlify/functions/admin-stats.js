const { json, requireAdmin } = require("./admin-session");

const emptyStats = () => ({
  total: 0,
  today: 0,
  yesterday: 0,
  last7Days: 0,
  thisMonth: 0,
  new: 0,
  assigned: 0,
  contacted: 0,
  quoted: 0,
  waiting: 0,
  won: 0,
  lost: 0,
  closed: 0,
  website: 0,
  manual: 0,
  whatsapp: 0,
  whatsappToday: 0,
  unassigned: 0,
  customerLeads: { total: 0, today: 0, yesterday: 0, last7Days: 0, thisMonth: 0 },
  source: {
    allLeads: 0,
    websiteForm: 0,
    whatsappForm: 0,
    manual: 0,
    whatsappClickLeads: 0,
    whatsappRawClicks: 0,
    whatsappConvertedClicks: 0,
    whatsappClickConversionRate: "0%"
  },
  assignment: { unassigned: 0, assigned: 0, admin_chen: 0, sales_zheng: 0 },
  status: { new: 0, contacted: 0, quoted: 0, waiting: 0, won: 0, lost: 0, closed: 0 },
  tabs: { websiteForm: 0, manual: 0, whatsappClick: 0, all: 0 }
});

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { ok: false, success: false, message: "Method not allowed" });
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  return json(200, { ok: true, success: true, stats: emptyStats(), items: [] });
};