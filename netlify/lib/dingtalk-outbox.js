const { createHash } = require("node:crypto");
const ding = require("./dingtalk-inquiry");

const minute = 60_000;
const backoff = [5, 15, 60, 240];
const terminal = new Set(["delivered", "failed", "uncertain"]);

async function openStore(event) {
  const { getStore, connectLambda } = await import("netlify-notification-blobs");
  if (event?.blobs && !process.env.NETLIFY_BLOBS_CONTEXT && !globalThis.netlifyBlobsContext) connectLambda(event);
  // Atomic conditional writes arbitrate claims even if a cached read sees an old version.
  return getStore("zhonggu-dingtalk-outbox");
}

function createOutbox(store, transport = ding, now = Date.now) {
  const get = name => store.getWithMetadata(name, { type: "json" });
  const save = (name, current, value) => {
    if (!current.etag) throw new Error("Missing notification record version");
    return store.setJSON(name, value, { onlyIfMatch: current.etag });
  };
  function finish(job, state, reason) {
    return { state, reason, attempts: job.attempts, taskId: job.taskId ?? null, finishedAt: now() };
  }
  function failedAttempt(job, reason) {
    if (job.attempts > backoff.length) return finish(job, "failed", reason);
    return { ...job, state: "queued", taskId: null, due: now() + backoff[job.attempts - 1] * minute };
  }

  async function process(key, fresh) {
    const name = "jobs/" + key;
    const current = fresh ?? await get(name);
    if (!current) return;
    const job = current.data;
    if (terminal.has(job.state)) {
      await store.delete("pending/" + key);
      return;
    }
    if (job.due > now()) return;

    let next;
    let expected = current;
    if (job.state === "sending") {
      next = finish(job, "uncertain", "send interrupted");
    } else if (job.state === "accepted") {
      if (now() - job.acceptedAt >= 23 * 60 * minute) {
        next = finish(job, "uncertain", "delivery receipt expired");
      } else {
        let result = "pending";
        try {
          result = await transport.deliveryResult(await transport.getAccessToken(), job.taskId);
        } catch { /* Leave the accepted attempt intact until it can be checked. */ }
        if (result === "delivered") next = finish(job, "delivered", result);
        else if (result === "failed") next = failedAttempt(job, result);
        else if (result === "invalid") next = finish(job, "failed", result);
        else if (result === "unconfirmed") next = finish(job, "uncertain", result);
        else next = { ...job, due: now() + 5 * minute };
      }
    } else if (job.state === "queued") {
      const sending = { ...job, state: "sending", attempts: job.attempts + 1, due: now() + 2 * minute };
      const claim = await save(name, current, sending);
      if (!claim.modified || !claim.etag) return;
      expected = claim;

      let token;
      try {
        token = await transport.getAccessToken();
      } catch {
        next = failedAttempt(sending, "authentication");
      }
      if (token) {
        try {
          const outcome = await transport.notifyInquiry(sending.lead, token);
          next = outcome.rejected
            ? failedAttempt(sending, "rejected")
            : { ...sending, state: "accepted", taskId: outcome.taskId, acceptedAt: now(), due: now() + minute };
        } catch {
          next = finish(sending, "uncertain", "no send receipt");
        }
      }
    }
    if (!next) return;
    const write = await save(name, expected, next);
    if (!write.modified) return;
    if (next.state === "accepted") console.info("[inquiries] DingTalk accepted", { taskId: next.taskId });
    if (terminal.has(next.state)) {
      if (next.state !== "delivered") console.warn("[inquiries] DingTalk outbox stopped", { key, status: next.state, reason: next.reason, taskId: next.taskId });
      await store.delete("pending/" + key);
    }
  }

  async function enqueue(lead) {
    const identity = lead.submissionId
      ? [lead.submissionId, lead.whatsapp, lead.name]
      : [lead.id];
    const key = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
    const name = "jobs/" + key;
    // Write the index first so an interrupted invocation cannot leave an unindexed job.
    await store.setJSON("pending/" + key, { createdAt: now() }, { onlyIfNew: true });
    const job = {
      state: "queued", attempts: 0, due: now(), lead: {
        id: lead.id, name: String(lead.name || "").slice(0, 100), country: String(lead.country || "").slice(0, 80),
        vehicle: String(lead.vehicle || "").slice(0, 150), message: String(lead.message || "").slice(0, 500),
        whatsapp: lead.whatsapp
      }
    };
    const written = await store.setJSON(name, job, { onlyIfNew: true });
    await process(key, written.modified && written.etag ? { data: job, etag: written.etag } : undefined);
  }

  async function sweep() {
    const deadline = now() + 17_000;
    let checked = 0;
    let errors = 0;
    for await (const page of store.list({ prefix: "pending/", paginate: true })) {
      for (let start = 0; start < page.blobs.length && now() < deadline; start += 4) {
        const results = await Promise.allSettled(page.blobs.slice(start, start + 4).map(async ({ key }) => {
          const id = key.slice("pending/".length);
          const current = await get("jobs/" + id);
          if (current) return process(id, current);
          const marker = await get(key);
          if (marker && now() - marker.data.createdAt >= 24 * 60 * minute && !await get("jobs/" + id)) await store.delete(key);
        }));
        checked += results.length;
        errors += results.filter(result => result.status === "rejected").length;
      }
      if (now() >= deadline) break;
    }
    return { checked, errors };
  }

  return { enqueue, sweep };
}

async function queueInquiry(lead, event) {
  return createOutbox(await openStore(event)).enqueue(lead);
}

async function runOutbox(event) {
  return createOutbox(await openStore(event)).sweep();
}

module.exports = { createOutbox, queueInquiry, runOutbox };
