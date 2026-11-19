const { runOutbox } = require("../lib/dingtalk-outbox");

exports.handler = async event => {
  const result = await runOutbox(event);
  console.info("[inquiries] DingTalk outbox check", result);
  return { statusCode: result.errors ? 500 : 200, body: "" };
};
