const { identifyInboxOwner } = require("../lib/dingtalk-inquiry");
const { openStore } = require("../lib/dingtalk-outbox");
const { keyPattern, listInbox } = require("../lib/dingtalk-inbox");

function respond(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(data)
  };
}

function createHandler(identify = identifyInboxOwner, getStore = openStore) {
  return async event => {
    if (event.httpMethod !== "POST") return respond(405, { error: "METHOD_NOT_ALLOWED" });
    if (!event.body || event.body.length > 2048) return respond(400, { error: "INVALID_REQUEST" });

    let input;
    try {
      input = JSON.parse(event.body);
    } catch {
      return respond(400, { error: "INVALID_REQUEST" });
    }

    const { code, before } = input || {};
    if (typeof code !== "string" || !/^[A-Za-z0-9._-]{1,256}$/.test(code)) {
      return respond(401, { error: "AUTH_REQUIRED" });
    }
    if (before != null && (typeof before !== "string" || !keyPattern.test(before))) {
      return respond(400, { error: "INVALID_CURSOR" });
    }

    try {
      if (!await identify(code)) return respond(403, { error: "ACCESS_DENIED" });
      return respond(200, await listInbox(await getStore(event), before));
    } catch {
      console.error("[dingtalk-inbox] Request failed");
      return respond(503, { error: "TEMPORARILY_UNAVAILABLE" });
    }
  };
}

exports.createHandler = createHandler;
exports.handler = createHandler();
