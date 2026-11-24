const { whatsappLink } = require('../../whatsapp');

Page({
  data: {item: null, chatUrl: '', canOpenChat: false, chatFailed: false},
  onLoad(query) {
    const app = getApp();
    const item = app.selectedInquiry;
    app.selectedInquiry = null;
    this.contactUrl = whatsappLink(item);
    this.setData({
      item,
      canOpenChat: Boolean(this.contactUrl),
      chatUrl: query && query.chat === '1' ? this.contactUrl : ''
    });
  },
  openWhatsApp() {
    if (this.contactUrl) this.setData({chatUrl: this.contactUrl, chatFailed: false});
  },
  showChatError() {
    this.setData({chatUrl: '', chatFailed: true});
  },
  copyContact(event) {
    const item = this.data.item;
    if (!item) return;
    const field = event.currentTarget.dataset.field;
    const value = field === 'whatsapp' && item.whatsapp ? '+' + item.whatsapp : item[field];
    if (value) dd.setClipboard({text: value});
  }
});
