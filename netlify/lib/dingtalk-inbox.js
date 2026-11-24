const prefix = "inbox/";
const pageSize = 20;
const keyPattern = /^inbox\/[0-9]{13}\/[0-9a-f]{64}$/;

async function recordDelivery(store, jobKey, job) {
  const key = prefix + String(job.acceptedAt).padStart(13, "0") + "/" + jobKey;
  await store.setJSON(key, {
    ...job.lead,
    pushedAt: new Date(job.acceptedAt).toISOString()
  }, { onlyIfNew: true });
}

async function listInbox(store, before) {
  const { blobs } = await store.list({ prefix });
  const keys = blobs.map(blob => blob.key)
    .filter(key => keyPattern.test(key) && (!before || key < before))
    .sort().reverse().slice(0, pageSize + 1);
  const page = keys.slice(0, pageSize);
  const items = await Promise.all(page.map(key => store.get(key, { type: "json" })));
  if (items.some(item => !item)) throw new Error("Incomplete inbox page");
  return { items, next: keys.length > pageSize ? page.at(-1) : null };
}

module.exports = { keyPattern, listInbox, recordDelivery };
