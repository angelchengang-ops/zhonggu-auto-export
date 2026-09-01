const NAS_SUMMARY_URL =
  "https://faw-bestunecyns.tailcb7df7.ts.net:8443/api/public-summary";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
    body: JSON.stringify(body),
  };
}

function isSafeSummary(value) {
  if (!value || typeof value !== "object") return false;
  if (!value.date || !value.executedAt || !value.dataPolicy) return false;

  return Object.values(value.dataPolicy).every((allowed) => allowed === false);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return response(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(NAS_SUMMARY_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return response(502, { ok: false, error: "NAS_SUMMARY_UNAVAILABLE" });
    }

    const summary = await upstream.json();
    if (!isSafeSummary(summary)) {
      return response(502, { ok: false, error: "NAS_SUMMARY_REJECTED" });
    }

    return response(200, summary);
  } catch {
    return response(502, { ok: false, error: "NAS_SUMMARY_UNAVAILABLE" });
  } finally {
    clearTimeout(timeout);
  }
};

exports.isSafeSummary = isSafeSummary;
