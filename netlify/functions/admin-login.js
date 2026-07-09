const { ADMIN_USER, createSessionCookie, json, safeEqual } = require("./admin-session");

const parseBody = (event) => {
  const raw = event.body || "";
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  if (!raw) return {};
  if (contentType.includes("application/json")) return JSON.parse(raw);
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, success: false, message: "Method not allowed" });
  }

  const configuredPassword = process.env.ZHONGGU_ADMIN_PASSWORD;
  if (!configuredPassword) {
    return json(500, { ok: false, success: false, message: "ZHONGGU_ADMIN_PASSWORD is not configured" });
  }

  try {
    const body = parseBody(event);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (username === "admin" && safeEqual(password, configuredPassword)) {
      return json(200, { ok: true, success: true, user: ADMIN_USER }, { "Set-Cookie": createSessionCookie() });
    }

    return json(401, { ok: false, success: false, message: "用户名或密码错误" });
  } catch {
    return json(401, { ok: false, success: false, message: "用户名或密码错误" });
  }
};
