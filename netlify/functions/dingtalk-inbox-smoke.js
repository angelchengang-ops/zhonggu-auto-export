const { queueInquiry } = require("../lib/dingtalk-outbox");

exports.handler = async event => {
  await queueInquiry({
    id: "SMOKE-DINGTALK-INBOX-20261124",
    name: "【上线验收测试】",
    vehicle: "询盘收件箱测试",
    message: "这是一条系统验收通知，没有对应客户。",
    replyChannel: "email",
    email: "inbox-test@example.invalid"
  }, event);
  console.info("[dingtalk-inbox] One-time smoke notification queued");
  return { statusCode: 200, body: "" };
};
