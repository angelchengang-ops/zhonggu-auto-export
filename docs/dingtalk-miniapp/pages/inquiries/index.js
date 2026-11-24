const { whatsappLink } = require('../../whatsapp');

function displayTime(value) {
  const shanghai = new Date(Date.parse(value) + 8 * 60 * 60 * 1000);
  return shanghai.toISOString().slice(0, 16).replace('T', ' ');
}

Page({
  data: {items: [], groups: [], next: null, loading: false, error: ''},
  onShow() {
    if (!this.data.items.length) this.refresh();
  },
  onPullDownRefresh() {
    this.refresh().finally(() => dd.stopPullDownRefresh());
  },
  refresh() {
    return this.load(null);
  },
  loadMore() {
    if (this.data.next) return this.load(this.data.next);
  },
  async load(before) {
    if (this.data.loading) return;
    this.setData({loading: true, error: ''});
    try {
      const result = await getApp().loadInbox(before);
      const page = result.items.map(item => ({...item, time: displayTime(item.pushedAt)}));
      const items = before ? this.data.items.concat(page) : page;
      const groups = [
        {title: '有 WhatsApp', items: items.filter(item => whatsappLink(item))},
        {title: '无 WhatsApp', items: items.filter(item => !whatsappLink(item))}
      ].filter(group => group.items.length);
      this.setData({items, groups, next: result.next});
    } catch (error) {
      this.setData({error: error.message});
    } finally {
      this.setData({loading: false});
    }
  },
  open(event) {
    this.openInquiry(event, true);
  },
  showDetails(event) {
    this.openInquiry(event, false);
  },
  openInquiry(event, openChat) {
    const selected = this.data.items.find(item => item.id === event.currentTarget.dataset.id);
    if (!selected) return;
    getApp().selectedInquiry = selected;
    const chat = openChat && whatsappLink(selected);
    dd.navigateTo({url: '/pages/detail/index' + (chat ? '?chat=1' : '')});
  }
});
