const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createOutbox } = require("../netlify/lib/dingtalk-outbox");
const { listInbox, recordDelivery } = require("../netlify/lib/dingtalk-inbox");
const { createHandler } = require("../netlify/functions/dingtalk-inbox");

function memoryStore() {
  const entries = new Map();
  let version = 0;
  let archiveFailures = 0;
  return {
    failArchiveOnce() { archiveFailures++; },
    async getWithMetadata(key) { return entries.get(key) ?? null; },
    async get(key) { return entries.get(key)?.data ?? null; },
    async setJSON(key, data, options = {}) {
      if (key.startsWith("inbox/") && archiveFailures) {
        archiveFailures--;
        throw new Error("Storage unavailable");
      }
      const old = entries.get(key);
      if ((options.onlyIfNew && old) || (options.onlyIfMatch && options.onlyIfMatch !== old?.etag)) {
        return { modified: false };
      }
      const etag = String(++version);
      entries.set(key, { data, etag });
      return { modified: true, etag };
    },
    async delete(key) { entries.delete(key); },
    list({ prefix, paginate }) {
      const blobs = [...entries.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key }));
      return paginate ? (async function* () { yield { blobs }; })() : Promise.resolve({ blobs });
    }
  };
}

test("outbox archives only after delivery and retries an interrupted archive without resending", async () => {
  const store = memoryStore();
  let now = Date.UTC(2026, 10, 24);
  let sends = 0;
  let receipt = "pending";
  const outbox = createOutbox(store, {
    async getAccessToken() { return "mock"; },
    async notifyInquiry() { return { taskId: ++sends }; },
    async deliveryResult() { return receipt; }
  }, () => now);
  const inquiry = { id: "INQ-TEST", name: "Synthetic", vehicle: "Example", email: "test@example.invalid" };
  await outbox.enqueue(inquiry);
  now += 60_000;
  await outbox.sweep();
  assert.deepEqual(await listInbox(store), { items: [], next: null });
  now += 300_000;
  receipt = "delivered";
  store.failArchiveOnce();
  assert.equal((await outbox.sweep()).errors, 1);
  now += 24 * 60 * 60_000;
  assert.equal((await outbox.sweep()).errors, 0);
  await outbox.enqueue(inquiry);
  assert.equal(sends, 1);
  const { items } = await listInbox(store);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, inquiry.id);
  assert.equal(items[0].pushedAt, "2026-11-24T00:00:00.000Z");
});

test("owner authentication comes before storage and pages are stable and newest first", async () => {
  const store = memoryStore();
  for (let index = 0; index < 22; index++) {
    const key = index.toString(16).padStart(64, "0");
    await recordDelivery(store, key, { acceptedAt: 1_800_000_000_000, lead: { id: index } });
  }
  let opens = 0;
  const handler = createHandler(async code => code === "owner", async () => {
    opens++;
    return store;
  });
  assert.equal((await handler({ httpMethod: "GET" })).statusCode, 405);
  assert.equal((await handler({ httpMethod: "POST", body: "{}" })).statusCode, 401);
  assert.equal((await handler({ httpMethod: "POST", body: '{"code":"other"}' })).statusCode, 403);
  assert.equal(opens, 0);
  const get = before => handler({ httpMethod: "POST", body: JSON.stringify({ code: "owner", before }) });
  const first = await handler({
    httpMethod: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "code=owner"
  });
  assert.equal(first.headers["Cache-Control"], "private, no-store");
  const page = JSON.parse(first.body);
  assert.deepEqual(page.items.map(item => item.id), Array.from({ length: 20 }, (_, index) => 21 - index));
  const second = JSON.parse((await get(page.next)).body);
  assert.deepEqual(second.items.map(item => item.id), [1, 0]);
  assert.equal(second.next, null);
  assert.equal((await get("invalid")).statusCode, 400);
});
