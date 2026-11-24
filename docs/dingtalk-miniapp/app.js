const { corpId, inboxUrl } = require('./config');

App({
  selectedInquiry: null,

  async loadInbox(before) {
    const code = await new Promise((resolve, reject) => {
      dd.getAuthCode({
        corpId,
        success: result => result.authCode
          ? resolve(result.authCode)
          : reject(new Error('未取得钉钉授权，请重新打开应用。')),
        fail: () => reject(new Error('钉钉身份验证失败，请重新打开应用。'))
      });
    });

    return new Promise((resolve, reject) => {
      const failed = () => reject(new Error('暂时无法读取询盘，请稍后重试。'));
      dd.httpRequest({
        url: inboxUrl,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify({code, before}),
        dataType: 'json',
        timeout: 15000,
        success: response => {
          try {
            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (response.status === 200 && Array.isArray(data.items)) return resolve(data);
            if (response.status === 403 || (data && data.error === 'ACCESS_DENIED')) {
              return reject(new Error('当前钉钉账号没有查看权限。'));
            }
          } catch (_) {
            return failed();
          }
          failed();
        },
        fail: failed
      });
    });
  }
});
