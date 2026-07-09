const { ADMIN_USER, json, requireAdmin } = require("./admin-session");

const users = () => [{
  id: "admin_chen",
  username: ADMIN_USER.username,
  name: ADMIN_USER.name,
  role: ADMIN_USER.role,
  active: true,
  whatsapp: "",
  markets: ["All"]
}];

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;

  if (event.httpMethod === "GET") return json(200, { ok: true, success: true, users: users() });
  if (["POST", "PATCH", "DELETE"].includes(event.httpMethod)) {
    return json(501, { ok: false, success: false, message: "当前线上后台为轻量版，暂不支持员工写入。", error: "当前线上后台为轻量版，暂不支持员工写入。" });
  }
  return json(405, { ok: false, success: false, message: "Method not allowed" });
};