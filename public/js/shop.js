// ============ 商城（皮肤 + 道具 + 复活） ============
App.Shop = {
  paying: null,
  tab: 'skins', // 'skins' | 'items' | 'revive'

  show: function(tab) {
    this.tab = tab || 'skins';
    this.render();
  },

  render: function() {
    var self = this;
    var tabsHtml = '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;">'
      + '<button class="btn-sm" onclick="App.Shop.renderTab(\'skins\')" style="' + (this.tab==='skins'?'border-color:#ffd700;color:#ffd700;':'') + '">🎨 皮肤</button>'
      + '<button class="btn-sm" onclick="App.Shop.renderTab(\'items\')" style="' + (this.tab==='items'?'border-color:#ffd700;color:#ffd700;':'') + '">🛠️ 道具</button>'
      + '<button class="btn-sm" onclick="App.Shop.renderTab(\'revive\')" style="' + (this.tab==='revive'?'border-color:#ffd700;color:#ffd700;':'') + '">💖 复活</button>'
      + '</div>';

    if (this.tab === 'skins') {
      App.api('/shop/skins').then(function(data) {
        var skins = data.skins || App.SKINS;
        var owned = data.owned || ['classic'];
        var active = data.active || 'classic';
        var html = tabsHtml + '<div class="skin-grid">';
        for (var i = 0; i < skins.length; i++) {
          var sk = skins[i];
          var isOwned = owned.indexOf(sk.id) >= 0;
          var isActive = active === sk.id;
          var badge = '';
          if (isActive) badge = '<span class="skin-badge-left">使用中</span>';
          else if (isOwned) badge = '<span class="skin-badge-right">已拥有</span>';
          var priceText = isOwned ? (isActive ? '当前使用' : '点击使用') : '¥' + sk.price;
          html += '<div class="skin-card ' + (isOwned ? 'owned' : '') + ' ' + (isActive ? 'active' : '') + '" onclick="App.Shop.selectSkin(\'' + sk.id + '\')">'
               + badge
               + '<div class="skin-preview" style="background:linear-gradient(135deg,' + self.getColor(sk.id,'top') + ',' + self.getColor(sk.id,'left') + ');"></div>'
               + '<div class="skin-name">' + sk.emoji + ' ' + sk.name + '</div>'
               + '<div class="skin-price">' + priceText + '</div></div>';
        }
        html += '</div>';
        document.getElementById('shopContent').innerHTML = html;
        App.UI.show('shopUI');
      });
    } else if (this.tab === 'items') {
      App.api('/user/shop').then(function(data) {
        var packs = data.packs || [];
        var html = tabsHtml + '<div class="skin-grid">';
        for (var i = 0; i < packs.length; i++) {
          var pk = packs[i];
          html += '<div class="skin-card" onclick="App.Shop.buyPack(\'' + pk.id + '\')">'
               + '<div style="font-size:36px;">' + pk.emoji + '</div>'
               + '<div class="skin-name">' + pk.name + '</div>'
               + '<div style="font-size:11px;color:#999;">' + pk.qty + '个道具</div>'
               + '<div class="skin-price">¥' + pk.price + '</div></div>';
        }
        html += '</div><p style="font-size:11px;color:#666;">道具每日免费刷新3个，购买可叠加</p>';
        document.getElementById('shopContent').innerHTML = html;
        App.UI.show('shopUI');
      });
    } else if (this.tab === 'revive') {
      var html = tabsHtml
        + '<div style="text-align:center;padding:20px;">'
        + '<div style="font-size:48px;">💖</div>'
        + '<h3 style="color:#fff;margin:8px 0;">复活令牌</h3>'
        + '<p style="color:#999;font-size:13px;">游戏结束后可继续挑战<br>保留当前分数和平台大小</p>'
        + '<p style="font-size:22px;font-weight:900;color:#ffd700;margin:12px 0;">¥2 / 个</p>'
        + '<button class="btn btn-gold" onclick="App.Shop.buyRevive()">购买复活令牌</button>'
        + '</div>';
      document.getElementById('shopContent').innerHTML = html;
      App.UI.show('shopUI');
    }
  },

  renderTab: function(tab) {
    this.tab = tab;
    this.render();
  },

  getColor: function(skinId, face) {
    for (var i = 0; i < App.SKINS.length; i++) {
      if (App.SKINS[i].id === skinId) return App.SKINS[i][face] || '#999';
    }
    return '#999';
  },

  selectSkin: function(skinId) {
    if (App.user && App.user.ownedSkins && App.user.ownedSkins.indexOf(skinId) >= 0) {
      this.equipSkin(skinId); return;
    }
    if (skinId === 'classic') { this.equipSkin(skinId); return; }
    if (!App.token) { App.UI.toast('请先登录再购买'); return; }
    this.paying = skinId;
    this.showPayment(skinId, 'skin');
  },

  equipSkin: function(skinId) {
    if (App.token) {
      var self = this;
      App.api('/shop/equip', { method:'POST', body:{skinId:skinId} }).then(function(data) {
        if (data.success) { App.user.activeSkin = data.activeSkin; self.render(); App.UI.toast('✅ 已切换'); }
      });
    } else {
      if (skinId !== 'classic') return;
      self.render(); App.UI.toast('✅ 已切换');
    }
  },

  buyPack: function(packId) {
    if (!App.token) { App.UI.toast('请先登录再购买'); return; }
    this.paying = packId;
    this.showPayment(packId, 'pack');
  },

  buyRevive: function() {
    if (!App.token) { App.UI.toast('请先登录再购买'); return; }
    this.paying = 'revive';
    this.showPayment('revive', 'revive');
  },

  showPayment: function(id, type) {
    var title = '', price = 0, skinId = '', packId = '';
    var sk = null;

    if (type === 'skin') {
      for (var i = 0; i < App.SKINS.length; i++) {
        if (App.SKINS[i].id === id) { sk = App.SKINS[i]; break; }
      }
      if (!sk) return;
      title = sk.emoji + ' ' + sk.name;
      price = sk.price;
      skinId = id;
    } else if (type === 'pack') {
      var packNames = {pack_slow_5:'🐢 减速礼包',pack_freeze_5:'❄️ 冻结礼包',pack_expand_5:'📏 扩展礼包',pack_mega:'🎁 全能大礼包'};
      var packPrices = {pack_slow_5:2,pack_freeze_5:2,pack_expand_5:2,pack_mega:5};
      title = packNames[id] || id;
      price = packPrices[id] || 0;
      packId = id;
    } else if (type === 'revive') {
      title = '💖 复活令牌';
      price = 2;
    }

    var content = document.getElementById('payContent');
    content.innerHTML = '<h2>💳 确认购买</h2>'
      + '<p style="font-size:15px;margin:8px 0;">' + title + '</p>'
      + '<p style="font-size:24px;font-weight:900;color:#ffd700;">¥' + price + '</p>'
      + '<div id="paySteps" style="margin:12px 0;"><div class="step"><span style="font-size:22px;">💳</span><span>正在拉起支付...</span></div></div>'
      + '<button class="btn-sm" onclick="App.UI.hide(\'payUI\')">关闭</button>';
    App.UI.show('payUI');

    var self = this;
    var psteps = document.getElementById('paySteps');
    var steps = [
      { icon:'🔐', text:'正在连接支付网关...' },
      { icon:'✅', text:'支付验证通过' },
      { icon:'🎁', text:'购买成功' }
    ];
    var idx = 0;
    var iv = setInterval(function() {
      if (idx < steps.length) {
        psteps.innerHTML += '<div class="step"><span style="font-size:18px;">' + steps[idx].icon + '</span><span>' + steps[idx].text + '</span></div>';
        idx++;
      } else {
        clearInterval(iv);
        // 实际执行购买
        var apiUrl = '';
        var apiBody = {};
        if (type === 'skin') { apiUrl = '/shop/purchase'; apiBody = {skinId:skinId}; }
        else if (type === 'pack') { apiUrl = '/user/shop/buy'; apiBody = {packId:packId}; }
        else if (type === 'revive') { apiUrl = '/user/buy-revive'; apiBody = {}; }

        App.api(apiUrl, { method:'POST', body:apiBody }).then(function(data) {
          if (data.success) {
            if (type === 'skin' && App.user) {
              App.user.activeSkin = skinId;
              App.user.ownedSkins = data.ownedSkins;
            }
            self.render();
            setTimeout(function() {
              var pc = document.getElementById('payContent');
              pc.innerHTML = '<div class="pay-ok">✅</div><h2>购买成功！</h2>'
                + '<p>' + title + '</p>'
                + '<p style="font-size:12px;color:#888;">模拟支付环境，上线时接入真实支付</p>'
                + '<button class="btn-sm" onclick="App.UI.hide(\'payUI\')">完成</button>';
            }, 400);
          } else {
            App.UI.hide('payUI');
            App.UI.toast('购买失败');
          }
        });
      }
    }, 800);
  }
};
