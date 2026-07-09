const crypto = require("crypto");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

const parseBody = (event) => {
  const raw = event.body || "";
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  if (!raw) return {};
  if (contentType.includes("application/json")) return JSON.parse(raw);
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, message: "Method not allowed" });
  }

  const configuredPassword = process.env.ZHONGGU_ADMIN_PASSWORD;
  if (!configuredPassword) {
    return json(500, { ok: false, message: "ZHONGGU_ADMIN_PASSWORD is not configured" });
  }

  try {
    const body = parseBody(event);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (username === "admin" && safeEqual(password, configuredPassword)) {
      return json(200, {
        ok: true,
        user: {
          username: "admin",
          role: "admin",
          name: "陈刚"
        }
      });
    }

    return json(401, { ok: false, message: "用户名或密码错误" });
  } catch {
    return json(401, { ok: false, message: "用户名或密码错误" });
  }
};