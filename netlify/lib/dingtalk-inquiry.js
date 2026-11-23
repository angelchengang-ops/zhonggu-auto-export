const agentId = 5152231732;
const recipient = "manager2141";

const cardText = (value, limit) => String(value || "")
  .replace(/[\[\]()*_`<>!#\\\r\n]/g, " ")
  .slice(0, limit)
  .trim();

async function post(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal
  });
  if (!response.ok) throw new Error("DingTalk request failed");
  return response.json();
}

async function getAccessToken() {
  const configured = process.env.ZHONGGU_DINGTALK_INQUIRY_CREDENTIALS;
  if (!configured) throw new Error("Missing DingTalk configuration");
  const { appKey, appSecret } = JSON.parse(configured);
  if (!appKey || !appSecret) throw new Error("Invalid DingTalk configuration");

  const signal = AbortSignal.timeout(5000);
  const auth = await post("https://api.dingtalk.com/v1.0/oauth2/accessToken", { appKey, appSecret }, signal);
  if (!auth.accessToken) throw new Error("DingTalk authentication failed");

  return auth.accessToken;
}

async function notifyInquiry(lead, token) {
  const signal = AbortSignal.timeout(5000);
  const phone = String(lead.whatsapp || "");
  const byEmail = lead.replyChannel === "email" || (!phone && lead.email);
  if (byEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email || ""))) throw new Error("Invalid email");
  if (!byEmail && !/^[1-9][0-9]{6,14}$/.test(phone)) throw new Error("Invalid WhatsApp number");

  const heading = "中谷网站新询盘";
  const id = cardText(lead.id, 100);
  const summary = [
    "客户：" + (cardText(lead.name, 80) || "未填写"),
    "国家：" + (cardText(lead.country, 60) || "未填写"),
    "车型：" + (cardText(lead.vehicle, 120) || "未填写"),
    "留言：" + (cardText(lead.message, 320) || "未填写"),
    byEmail ? "Email：" + cardText(lead.email, 254) : "WhatsApp：+" + phone,
    "编号：" + id
  ];
  const endpoint = new URL("https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2");
  endpoint.searchParams.set("access_token", token);
  const result = await post(endpoint, {
    agent_id: agentId,
    userid_list: recipient,
    to_all_user: false,
    msg: {
      msgtype: "action_card",
      action_card: {
        title: heading + " · " + id.slice(0, 40),
        markdown: "### " + heading + "\n\n" + summary.join("\n\n"),
        single_title: byEmail ? "打开 CRM 邮箱询盘" : "打开客户 WhatsApp",
        single_url: byEmail ? "https://zhongguauto.com/admin/inquiries.html?q=" + encodeURIComponent(lead.id) : "https://wa.me/" + phone
      }
    }
  }, signal);

  if (result.errcode === 0 && result.task_id) return { taskId: result.task_id };
  if (!result.task_id && Number.isInteger(result.errcode) && result.errcode !== 0) return { rejected: true };
  throw new Error("DingTalk send result unknown");
}

async function deliveryResult(token, taskId) {
  const endpoint = new URL("https://oapi.dingtalk.com/topapi/message/corpconversation/getsendresult");
  endpoint.searchParams.set("access_token", token);
  const response = await post(endpoint, { agent_id: agentId, task_id: taskId }, AbortSignal.timeout(4000));
  const result = response.send_result;
  if (response.errcode !== 0 || !result) return "pending";
  if (result.read_user_id_list?.includes(recipient) || result.unread_user_id_list?.includes(recipient)) return "delivered";
  if (result.invalid_user_id_list?.includes(recipient)) return "invalid";
  if (result.forbidden_user_id_list?.includes(recipient) || result.forbidden_list?.length) return "unconfirmed";
  if (result.failed_user_id_list?.includes(recipient)) {
    endpoint.pathname = "/topapi/message/corpconversation/getsendprogress";
    const progress = await post(endpoint, { agent_id: agentId, task_id: taskId }, AbortSignal.timeout(4000));
    if (progress.errcode === 0 && progress.progress?.status === 2) return "failed";
  }
  return "pending";
}

module.exports = { deliveryResult, getAccessToken, notifyInquiry };
