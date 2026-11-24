const { corpId, inboxUrl } = require('./config');

function getCode() {
  return new Promise((resolve, reject) => {
    dd.getAuthCode({
      corpId,
      success: result => result.authCode
        ? resolve(result.authCode)
        : reject(new Error('未取得钉钉授权，请重新打开应用。')),
      fail: () => reject(new Error('钉钉身份验证失败，请重新打开应用。'))
    });
  });
}

function serverError(status, body) {
  if (status === 403 || (body && body.error === 'ACCESS_DENIED')) {
    return new Error('当前钉钉账号没有查看权限。');
  }
  if (status === 404) return new Error('暂时找不到这条询盘，可以重试。');
  if (body && body.error === 'STORAGE_UNAVAILABLE') {
    return new Error('询盘存储暂时不可用，请稍后重试。');
  }
  return new Error('询盘服务暂时不可用，请稍后重试。');
}

function fetchInbox(code, query, useDingTalkNetwork) {
  return new Promise((resolve, reject) => {
    const options = {
      url: inboxUrl,
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      data: {...query, code},
      dataType: 'text',
      timeout: 10000,
      success: response => {
        let data;
        try {
          data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        } catch (_) {
          return reject(serverError(Number(response.status)));
        }
        const status = Number(response.status);
        if (status === 200 && data && (query.ref ? data.item : Array.isArray(data.items))) return resolve(data);
        reject(serverError(status, data));
      },
      fail: error => {
        const reason = Number(error && (error.error || error.errorCode));
        const status = Number(error && (error.status || error.statusCode));
        if (reason === 4 || reason === 11) return reject(new Error('钉钉尚未允许连接中谷官网（' + reason + '）。'));
        if (status === 403 || status === 404) return reject(serverError(status));
        const known = Number.isInteger(reason) && reason > 0;
        const message = '暂时无法读取询盘，请稍后重试' + (known ? '（' + reason + '）' : '') + '。';
        const failure = new Error(message);
        failure.canRetry = !known || reason === 12 || reason === 13;
        reject(failure);
      }
    };
    if (useDingTalkNetwork) options.impl = 'dt';
    dd.httpRequest(options);
  });
}

App({
  selectedInquiry: null,

  loadInbox(before) {
    return this.loadInquiryData(before ? {before} : {});
  },

  async loadInquiry(ref) {
    const result = await this.loadInquiryData({ref});
    return result.item;
  },

  async loadInquiryData(query) {
    const code = await getCode();
    try {
      return await fetchInbox(code, query, true);
    } catch (error) {
      if (!error.canRetry) throw error;
      return fetchInbox(await getCode(), query, false);
    }
  }
});
