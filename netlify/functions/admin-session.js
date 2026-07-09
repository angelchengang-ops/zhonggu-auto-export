const crypto = require("crypto");

const COOKIE_NAME = "zg_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const ADMIN_USER = Object.freeze({ username: "admin", role: "admin", name: "\u9648\u521a" });

const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  },
  body: JSON.stringify(body)
});

const getHeader = (headers = {}, name) => {
  const target = String(name).toLowerCase();
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === target);
  return key ? headers[key] : "";
};

const parseCookies = (header = "") => Object.fromEntries(
  String(header || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return [part.trim(), ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key)
);

const sign = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createSessionToken = () => {
  const secret = process.env.ZHONGGU_ADMIN_PASSWORD || "";
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
};

const createSessionCookie = () => `${COOKIE_NAME}=${encodeURIComponent(createSessionToken())}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax; Secure`;
const clearSessionCookie = () => `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;

const verifySessionToken = (token = "") => {
  const secret = process.env.ZHONGGU_ADMIN_PASSWORD || "";
  if (!secret) return false;
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return safeEqual(sign(payload, secret), parts[2]);
};


const getAdminUser = (event = {}) => {
  const cookies = parseCookies(getHeader(event.headers, "cookie"));
  if (verifySessionToken(cookies[COOKIE_NAME])) return ADMIN_USER;
  return null;
};

const requireAdmin = (event = {}) => {
  const user = getAdminUser(event);
  return user || json(401, { ok: false, success: false, message: "Unauthorized" });
};

const handler = async (event) => {
  const user = getAdminUser(event);
  if (!user) return json(401, { ok: false, success: false, message: "Unauthorized" });
  return json(200, { ok: true, success: true, user });
};

module.exports = {
  ADMIN_USER,
  clearSessionCookie,
  createSessionCookie,
  getAdminUser,
  json,
  requireAdmin,
  safeEqual,
  handler
};