const { json, requireAdmin } = require("./admin-session");

const lightMessage = "当前线上后台为轻量版，暂无可加载数据。";
const writeMessage = "当前线上后台为轻量版，暂不支持写入、分配、备注或导出真实 CRM 数据。";

const csv = () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Disposition": "attachment; filename=\"inquiries.csv\""
  },
  body: "\ufeffcreatedAt,name,country,whatsapp,vehicle,status\n"
});

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;

  const path = String(event.path || "");
  if (event.httpMethod === "GET" && path.endsWith("/export.csv")) return csv();

  if (event.httpMethod === "GET") {
    const isMember = /\/api\/admin\/inquiries\/[^/]+/.test(path) && !path.endsWith("/export.csv");
    if (isMember) {
      return json(200, { ok: true, success: true, inquiry: null, item: null, message: "暂无询盘数据。" });
    }
    return json(200, { ok: true, success: true, inquiries: [], items: [], total: 0, message: lightMessage });
  }

  if (["POST", "PATCH", "DELETE"].includes(event.httpMethod)) {
    return json(501, { ok: false, success: false, message: writeMessage, error: writeMessage });
  }

  return json(405, { ok: false, success: false, message: "Method not allowed" });
};