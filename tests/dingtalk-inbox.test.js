const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createOutbox, openStore } = require("../netlify/lib/dingtalk-outbox");
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

test("direct detail requires the owner and resolves before and after inbox archival", async () => {
  const store = memoryStore();
  const ref = "b".repeat(64);
  const lead = { id: "QA-EMAIL-DETAIL", email: "qa@example.invalid" };
  const handler = createHandler(async code => code === "owner", async () => store);
  const request = (code, reference = ref) => handler({
    httpMethod: "POST",
    body: JSON.stringify({ code, ref: reference })
  });
  await store.setJSON("jobs/" + ref, { state: "sending", lead });
  assert.equal((await request("other")).statusCode, 403);
  assert.equal((await request("owner", "../jobs")).statusCode, 400);
  assert.deepEqual(JSON.parse((await request("owner")).body).item, { ...lead, pushedAt: null });
  const acceptedAt = Date.UTC(2026, 10, 24);
  await store.setJSON("jobs/" + ref, { state: "delivered", archive: { lead, acceptedAt } });
  assert.deepEqual(JSON.parse((await request("owner")).body).item, {
    ...lead, pushedAt: "2026-11-24T00:00:00.000Z"
  });
  assert.equal((await request("owner", "c".repeat(64))).statusCode, 404);
});

test("sourcing delivery retains the listing for email and WhatsApp inbox entries", async () => {
  const store = memoryStore();
  let now = Date.UTC(2026, 10, 24);
  const sent = [];
  const outbox = createOutbox(store, {
    async getAccessToken() { return "mock"; },
    async notifyInquiry(lead, token, reference) {
      sent.push({ lead, reference });
      return { taskId: sent.length };
    },
    async deliveryResult() { return "delivered"; }
  }, () => now);
  const message = "Listing: https://www.che168.com/example";
  const listingUrl = "https://www.che168.com/example?" + "a".repeat(800);
  const common = {name: "Synthetic", vehicle: "Car Sourcing", message, listingUrl, sourceEntry: "car_sourcing", destinationPort: "Jebel Ali"};
  await outbox.enqueue({...common, id: "INQ-SOURCING-EMAIL", replyChannel: "email", email: "test@example.invalid"});
  await outbox.enqueue({...common, id: "INQ-SOURCING-WA", replyChannel: "whatsapp", whatsapp: "12133734253"});
  now += 60_000;
  await outbox.sweep();
  const {items} = await listInbox(store);
  assert.equal(sent.length, 2);
  assert.ok(sent.every(item => /^[a-f\d]{64}$/.test(item.reference)));
  assert.equal(items.length, 2);
  assert.ok(items.every(item => item.message === message && item.vehicle === "Car Sourcing" && item.listingUrl === listingUrl && item.sourceEntry === "car_sourcing" && item.destinationPort === "Jebel Ali"));
  assert.equal(items.find(item => item.id === "INQ-SOURCING-EMAIL").email, "test@example.invalid");
  assert.equal(items.find(item => item.id === "INQ-SOURCING-WA").whatsapp, "12133734253");
});

test("owner-only legacy sourcing lookup uses exact CRM ID without importing forms", async () => {
  const store = memoryStore();
  const ref = "c".repeat(64);
  const old = {id: "INQ-LEGACY", vehicle: "Car Sourcing · Lavida", message: "Listing: historical snippet"};
  const listingUrl = "https://www.guazi.com/car-detail/example.html";
  const acceptedAt = Date.UTC(2026, 10, 24);
  await store.setJSON("jobs/" + ref, {state: "delivered", archive: {lead: old, acceptedAt}});
  await recordDelivery(store, ref, {lead: old, acceptedAt});
  let calls = 0;
  const handler = createHandler(async code => code === "owner", async () => store, async options => {
    calls++;
    assert.deepEqual(options, {syncForms: false});
    return {items: [
      {id: "INQ-UNRELATED", sourceEntry: "car_sourcing", listingUrl: "https://example.invalid/unrelated"},
      {id: old.id, sourceEntry: "car_sourcing", listingUrl, destinationPort: "Jebel Ali"}
    ]};
  });
  const request = body => handler({httpMethod: "POST", body: JSON.stringify(body)});
  assert.equal((await request({code: "other", ref})).statusCode, 403);
  assert.equal(calls, 0);
  const detail = JSON.parse((await request({code: "owner", ref})).body).item;
  assert.equal(detail.listingUrl, listingUrl);
  assert.equal(detail.sourceEntry, "car_sourcing");
  assert.equal(detail.destinationPort, "Jebel Ali");
  const inbox = JSON.parse((await request({code: "owner"})).body);
  assert.deepEqual(inbox.items, [detail]);
  assert.equal(calls, 2);
});

test("sourcing email and WhatsApp notification cards both open the exact inquiry", async () => {
  const original = global.fetch;
  const cards = [];
  const responses = [];
  global.fetch = async (url, options) => {
    cards.push(JSON.parse(options.body).msg.action_card);
    return {ok: true, json: async () => (responses.shift() || {errcode: 0, task_id: 123})};
  };
  try {
    const {notifyInquiry} = require("../netlify/lib/dingtalk-inquiry");
    const ref = "d".repeat(64);
    const base = {id: "INQ-SOURCING", sourceEntry: "car_sourcing", vehicle: "Car Sourcing · Lavida", destinationPort: "Jebel Ali"};
    await notifyInquiry({...base, replyChannel: "email", email: "test@example.invalid"}, "mock", ref);
    await notifyInquiry({...base, replyChannel: "whatsapp", whatsapp: "12133734253"}, "mock", ref);
    responses.push({errcode: 400002});
    await notifyInquiry({...base, replyChannel: "whatsapp", whatsapp: "12133734253"}, "mock", ref);
    assert.equal(cards.length, 4);
    for (const card of cards) {
      assert.equal(card.title, "二手车撮合 · INQ-SOURCING");
      assert.match(card.markdown, /^### 二手车撮合｜Lavida/);
      assert.match(card.markdown, /Jebel Ali/);
    }
    assert.equal(cards[0].single_title, "查看撮合详情");
    assert.equal(cards[0].single_url, "eapp://pages/detail/index?ref=" + ref);
    assert.deepEqual(cards[1].btn_json_list, [
      {title: "查看撮合详情", action_url: "eapp://pages/detail/index?ref=" + ref},
      {title: "打开 WhatsApp", action_url: "https://wa.me/12133734253"}
    ]);
    assert.deepEqual(cards[2], cards[1]);
    assert.equal(cards[3].single_url, cards[0].single_url);
    assert.equal(cards[3].markdown, cards[1].markdown);
    assert.equal(cards[3].btn_json_list, undefined);
  } finally {
    global.fetch = original;
  }
});

test("miniapp sourcing detail copies the full URL and opens WhatsApp only on request", () => {
  const detailFile = require.resolve("../docs/dingtalk-miniapp/pages/detail/index");
  const originalPage = global.Page;
  const originalDing = global.dd;
  let definition;
  const clipboard = [];
  global.Page = page => { definition = page; };
  global.dd = {setClipboard: ({text}) => clipboard.push(text)};
  try {
    delete require.cache[detailFile];
    require(detailFile);
    const page = {...definition, data: {}, setData(data) { Object.assign(this.data, data); }};
    const listingUrl = "https://www.guazi.com/car-detail/example.html?x=" + "b".repeat(800);
    page.showInquiry({sourceEntry: "car_sourcing", listingUrl, message: "Listing: shortened\nQuote please", email: "test@example.invalid"}, true);
    assert.equal(page.data.listingLabel, "瓜子车源");
    assert.equal(page.data.notes, "Quote please");
    assert.equal(page.data.canOpenChat, false);
    page.copyListing();
    page.copyContact({currentTarget: {dataset: {field: "email"}}});
    assert.deepEqual(clipboard, [listingUrl, "test@example.invalid"]);
    page.showInquiry({sourceEntry: "car_sourcing", listingUrl, whatsapp: "12133734253"}, true);
    assert.equal(page.data.chatUrl, "");
    page.openWhatsApp();
    assert.equal(page.data.chatUrl, "https://wa.me/12133734253");
    page.showInquiry({whatsapp: "12133734253"}, true);
    assert.equal(page.data.chatUrl, "https://wa.me/12133734253");
  } finally {
    global.Page = originalPage;
    global.dd = originalDing;
    delete require.cache[detailFile];
  }
});

test("warm Lambda invocations refresh the notification store token", async () => {
  const old = process.env.NETLIFY_BLOBS_CONTEXT;
  const oldGlobal = globalThis.netlifyBlobsContext;
  delete globalThis.netlifyBlobsContext;
  const connect = token => openStore({
    blobs: Buffer.from(JSON.stringify({url: "https://blob.example.invalid", token})).toString("base64"),
    headers: {"x-nf-site-id": "isolated-site", "x-nf-deploy-id": "isolated-deploy"}
  });
  const tokenInContext = () => JSON.parse(Buffer.from(process.env.NETLIFY_BLOBS_CONTEXT, "base64").toString()).token;
  try {
    await connect("isolated-first-token");
    assert.equal(tokenInContext(), "isolated-first-token");
    await connect("isolated-fresh-token");
    assert.equal(tokenInContext(), "isolated-fresh-token");
  } finally {
    if (old === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT;
    else process.env.NETLIFY_BLOBS_CONTEXT = old;
    if (oldGlobal === undefined) delete globalThis.netlifyBlobsContext;
    else globalThis.netlifyBlobsContext = oldGlobal;
  }
});
