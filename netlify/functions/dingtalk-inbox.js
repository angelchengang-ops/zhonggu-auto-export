const { identifyInboxOwner } = require("../lib/dingtalk-inquiry");
const { openStore } = require("../lib/dingtalk-outbox");
const { keyPattern, listInbox, readInquiry } = require("../lib/dingtalk-inbox");

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
      const contentType = Object.entries(event.headers || {})
        .find(([name]) => name.toLowerCase() === "content-type")?.[1] || "";
      input = contentType.startsWith("application/x-www-form-urlencoded")
        ? Object.fromEntries(new URLSearchParams(event.body))
        : JSON.parse(event.body);
    } catch {
      return respond(400, { error: "INVALID_REQUEST" });
    }

    const { code, before, ref } = input || {};
    if (typeof code !== "string" || !/^[!-~]{1,512}$/.test(code)) {
      return respond(401, { error: "AUTH_REQUIRED" });
    }
    if (before != null && (typeof before !== "string" || !keyPattern.test(before))) {
      return respond(400, { error: "INVALID_CURSOR" });
    }

    if (ref != null && (before != null || typeof ref !== "string" || !/^[0-9a-f]{64}$/.test(ref))) {
      return respond(400, { error: "INVALID_REFERENCE" });
    }

    let owner;
    try {
      owner = await identify(code);
    } catch {
      console.error("[dingtalk-inbox] DingTalk identity service unavailable");
      return respond(503, { error: "IDENTITY_UNAVAILABLE" });
    }
    if (!owner) {
      console.info("[dingtalk-inbox] DingTalk identity rejected");
      return respond(403, { error: "ACCESS_DENIED" });
    }

    try {
      const store = await getStore(event);
      if (ref) {
        const item = await readInquiry(store, ref);
        console.info("[dingtalk-inbox] Owner inquiry detail", { found: Boolean(item) });
        return item ? respond(200, { item }) : respond(404, { error: "INQUIRY_NOT_FOUND" });
      }
      const page = await listInbox(store, before);
      console.info("[dingtalk-inbox] Owner inbox read", { records: page.items.length });
      return respond(200, page);
    } catch {
      console.error("[dingtalk-inbox] Inbox storage read failed");
      return respond(503, { error: "STORAGE_UNAVAILABLE" });
    }
  };
}

exports.createHandler = createHandler;
exports.handler = createHandler();
