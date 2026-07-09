const { json, requireAdmin } = require("./admin-session");

const users = () => [
  { id: "admin_chen", username: "admin", name: "Chen Gang", role: "admin", active: true, whatsapp: "", markets: ["All"] },
  { id: "sales_zheng", username: "zheng", name: "Zheng Guozhi", role: "sales", active: true, whatsapp: "", markets: ["Africa", "Used Cars"] }
];

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  if (event.httpMethod === "GET") return json(200, { ok: true, success: true, users: users() });
  if (["POST", "PATCH", "DELETE"].includes(event.httpMethod)) {
    return json(200, { ok: true, success: true, users: users(), message: "线上轻量版员工管理暂不支持持久化编辑。" });
  }
  return json(405, { ok: false, success: false, message: "Method not allowed" });
};