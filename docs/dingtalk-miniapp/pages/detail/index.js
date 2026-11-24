Page({
  data: {item: null},
  onLoad() {
    const app = getApp();
    this.setData({item: app.selectedInquiry});
    app.selectedInquiry = null;
  },
  copyContact(event) {
    const item = this.data.item;
    if (!item) return;
    const field = event.currentTarget.dataset.field;
    const value = field === 'whatsapp' && item.whatsapp ? '+' + item.whatsapp : item[field];
    if (value) dd.setClipboard({text: value});
  }
});
