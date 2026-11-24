const { createOutbox, openStore } = require("../lib/dingtalk-outbox");

const idPrefix = "QA-DINGTALK-20261124-PAIR-";

exports.handler = async event => {
  const config = process.env.ZHONGGU_DINGTALK_QA_PAIR_20261124;
  if (!config || Date.now() >= Date.parse("2026-11-25T00:00:00+08:00")) {
    return { statusCode: 410, body: "" };
  }
  let contacts;
  try {
    contacts = JSON.parse(config);
  } catch {
    return { statusCode: 400, body: "" };
  }
  if (!/^861[0-9]{10}$/.test(contacts?.whatsapp || "") ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts?.email || "")) {
    return { statusCode: 400, body: "" };
  }
  const queue = createOutbox(await openStore(event));
  await queue.enqueue({
    id: idPrefix + "WA", name: "【模拟测试 1/2】WhatsApp 询盘",
    country: "中国（模拟）", vehicle: "Geely Coolray（模拟）",
    message: "测试通知卡和收件箱的 WhatsApp 跳转，无需发送消息。",
    replyChannel: "whatsapp", whatsapp: contacts.whatsapp
  });
  console.info("[DingTalk QA] WhatsApp job processed");
  await queue.enqueue({
    id: idPrefix + "EMAIL", name: "【模拟测试 2/2】邮箱询盘",
    country: "中国（模拟）", vehicle: "Bestune B70（模拟）",
    message: "测试通知卡打开钉钉收件箱，点击本条查看邮箱。",
    replyChannel: "email", email: contacts.email
  });
  console.info("[DingTalk QA] Email job processed");
  return { statusCode: 200, body: "" };
};
