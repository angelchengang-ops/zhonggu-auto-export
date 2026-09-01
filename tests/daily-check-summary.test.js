const test = require("node:test");
const assert = require("node:assert/strict");

const { handler, isSafeSummary } = require("../netlify/functions/daily-check-summary");

test("safe summary requires an explicit all-false data policy", () => {
  assert.equal(
    isSafeSummary({
      date: "2026-09-01",
      executedAt: "2026-09-01T08:01:00+08:00",
      dataPolicy: { customerDetails: false, credentials: false },
    }),
    true,
  );
  assert.equal(
    isSafeSummary({
      date: "2026-09-01",
      executedAt: "2026-09-01T08:01:00+08:00",
      dataPolicy: { customerDetails: true },
    }),
    false,
  );
});

test("relay returns only a validated NAS summary", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const summary = {
    date: "2026-09-01",
    executedAt: "2026-09-01T08:01:00+08:00",
    overallStatus: "success",
    dataPolicy: { customerDetails: false, credentials: false },
  };
  global.fetch = async () => ({
    ok: true,
    json: async () => summary,
  });

  const result = await handler({ httpMethod: "GET" });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), summary);
  assert.equal(result.headers["Cache-Control"], "no-store, no-cache, must-revalidate");
  assert.equal(result.headers["X-Robots-Tag"], "noindex, nofollow");
});

test("relay fails closed when the NAS payload violates the data policy", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      date: "2026-09-01",
      executedAt: "2026-09-01T08:01:00+08:00",
      dataPolicy: { customerDetails: true },
    }),
  });

  const result = await handler({ httpMethod: "GET" });
  assert.equal(result.statusCode, 502);
  assert.deepEqual(JSON.parse(result.body), {
    ok: false,
    error: "NAS_SUMMARY_REJECTED",
  });
});
