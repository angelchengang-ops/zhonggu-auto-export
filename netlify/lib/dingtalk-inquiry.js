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

async function notifyInquiry(lead) {
  const configured = process.env.ZHONGGU_DINGTALK_INQUIRY_CREDENTIALS;
  if (!configured) throw new Error("Missing DingTalk configuration");
  const { appKey, appSecret } = JSON.parse(configured);
  if (!appKey || !appSecret) throw new Error("Invalid DingTalk configuration");

  const signal = AbortSignal.timeout(5000);
  const auth = await post("https://api.dingtalk.com/v1.0/oauth2/accessToken", { appKey, appSecret }, signal);
  if (!auth.accessToken) throw new Error("DingTalk authentication failed");

  const phone = String(lead.whatsapp || "");
  if (!/^[1-9][0-9]{6,14}$/.test(phone)) throw new Error("Invalid WhatsApp number");

  const heading = "中谷网站新询盘";
  const id = cardText(lead.id, 100);
  const summary = [
    "客户：" + (cardText(lead.name, 80) || "未填写"),
    "国家：" + (cardText(lead.country, 60) || "未填写"),
    "车型：" + (cardText(lead.vehicle, 120) || "未填写"),
    "留言：" + (cardText(lead.message, 320) || "未填写"),
    "WhatsApp：+" + phone,
    "编号：" + id
  ];
  const endpoint = new URL("https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2");
  endpoint.searchParams.set("access_token", auth.accessToken);
  const result = await post(endpoint, {
    agent_id: agentId,
    userid_list: recipient,
    to_all_user: false,
    msg: {
      msgtype: "action_card",
      action_card: {
        title: heading + " · " + id.slice(0, 40),
        markdown: "### " + heading + "\n\n" + summary.join("\n\n"),
        single_title: "打开客户 WhatsApp",
        single_url: "https://wa.me/" + phone
      }
    }
  }, signal);

  if (result.errcode !== 0 || !result.task_id) throw new Error("DingTalk declined the notification");
  return result.task_id;
}

module.exports = { notifyInquiry };
