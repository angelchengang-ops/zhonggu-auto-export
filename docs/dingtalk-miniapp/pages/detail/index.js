const { whatsappLink } = require('../../whatsapp');

Page({
  data: {item: null, chatUrl: '', canOpenChat: false, chatFailed: false, loading: false, error: ''},
  onLoad(query) {
    const app = getApp();
    const item = app.selectedInquiry;
    app.selectedInquiry = null;
    if (query && query.ref) {
      this.ref = query.ref;
      this.loadInquiry();
      return;
    }
    this.showInquiry(item, query && query.chat === '1');
  },
  async loadInquiry() {
    if (this.data.loading) return;
    this.setData({loading: true, error: ''});
    try {
      const item = await getApp().loadInquiry(this.ref);
      const time = item.pushedAt
        ? new Date(Date.parse(item.pushedAt) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
        : '刚刚推送';
      this.showInquiry({...item, time}, false);
    } catch (error) {
      this.setData({error: error.message});
    } finally {
      this.setData({loading: false});
    }
  },
  showInquiry(item, openChat) {
    this.contactUrl = whatsappLink(item);
    const sourcing = item && item.sourceEntry === 'car_sourcing';
    const listingUrl = sourcing && /^https?:\/\//i.test(item.listingUrl || '') ? item.listingUrl : '';
    const listingLabel = /^https?:\/\/(?:[^/.]+\.)*guazi\.com(?:[/:?#]|$)/i.test(listingUrl) ? '瓜子车源'
      : /^https?:\/\/(?:[^/.]+\.)*che168\.com(?:[/:?#]|$)/i.test(listingUrl) ? '汽车之家车源' : '车源链接';
    const notes = listingUrl ? (item.message || '').replace(/^Listing: [^\r\n]*(?:\r?\n|$)/, '') : item && item.message;
    this.setData({
      item, sourcing, listingUrl, listingLabel, notes,
      canOpenChat: Boolean(this.contactUrl),
      chatUrl: openChat && !sourcing ? this.contactUrl : ''
    });
  },
  openWhatsApp() {
    if (this.contactUrl) this.setData({chatUrl: this.contactUrl, chatFailed: false});
  },
  showChatError() {
    this.setData({chatUrl: '', chatFailed: true});
  },
  copyListing() {
    if (this.data.listingUrl) dd.setClipboard({text: this.data.listingUrl});
  },
  copyContact(event) {
    const item = this.data.item;
    if (!item) return;
    const field = event.currentTarget.dataset.field;
    const value = field === 'whatsapp' && item.whatsapp ? '+' + item.whatsapp : item[field];
    if (value) dd.setClipboard({text: value});
  }
});
