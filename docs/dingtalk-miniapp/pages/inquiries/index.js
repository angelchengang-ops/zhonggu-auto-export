function displayTime(value) {
  const shanghai = new Date(Date.parse(value) + 8 * 60 * 60 * 1000);
  return shanghai.toISOString().slice(0, 16).replace('T', ' ');
}

Page({
  data: {items: [], next: null, loading: false, error: ''},
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
      const items = result.items.map(item => ({...item, time: displayTime(item.pushedAt)}));
      this.setData({items: before ? this.data.items.concat(items) : items, next: result.next});
    } catch (error) {
      this.setData({error: error.message});
    } finally {
      this.setData({loading: false});
    }
  },
  open(event) {
    const selected = this.data.items.find(item => item.id === event.currentTarget.dataset.id);
    if (!selected) return;
    getApp().selectedInquiry = selected;
    dd.navigateTo({url: '/pages/detail/index'});
  }
});
