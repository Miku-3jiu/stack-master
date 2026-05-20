// ============ UI 工具：Toast、分享、Overlay 管理 ============
App.UI = {
  // Overlay 切换
  show: function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('on');
  },

  hide: function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('on');
  },

  hideAll: function() {
    var overlays = document.querySelectorAll('.overlay');
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].classList.remove('on');
    }
  },

  // Toast 提示
  _tid: null,
  toast: function(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(this._tid);
    var self = this;
    this._tid = setTimeout(function() { t.classList.remove('on'); }, 1800);
  },

  // 分享
  share: function() {
    var text = '🏗️ 我在【叠塔大师】堆了 ' + App.Game.score + ' 层！\n眼疾手快，你能超过我吗？\n👉 ' + window.location.href;
    var self = this;
    if (navigator.share) {
      navigator.share({ title:'叠塔大师', text:'我在叠塔大师堆了'+App.Game.score+'层！快来挑战！', url:window.location.href })
        .catch(function() { self.fallbackCopy(text); });
    } else {
      this.fallbackCopy(text);
    }
  },

  fallbackCopy: function(text) {
    var self = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function() { self.toast('📋 分享文案已复制！'); },
        function() { self.legacyCopy(text); }
      );
    } else {
      this.legacyCopy(text);
    }
  },

  legacyCopy: function(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    this.toast('📋 分享文案已复制！');
  }
};
