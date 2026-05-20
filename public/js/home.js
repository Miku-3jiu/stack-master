// ============ 首页初始化 ============
(function() {
  // 加载用户信息
  function updateUI() {
    var userBar = document.getElementById('userBar');
    var authBtns = document.getElementById('authBtns');
    var skinInfo = document.getElementById('skinInfo');

    if (App.user) {
      if (userBar) userBar.innerHTML = '<p class="name">👤 ' + App.user.username + '</p>';
      if (authBtns) authBtns.innerHTML = ''
        + '<a href="profile.html"><button class="btn-sm">👤 个人中心</button></a>'
        + '<button class="btn-sm" onclick="App.logout()">🚪 退出登录</button>';
      if (skinInfo) skinInfo.textContent = '当前皮肤：' + App.getSkin().name;
    } else {
      if (userBar) userBar.innerHTML = '<p style="color:#888;">👤 游客模式</p>';
      if (authBtns) authBtns.innerHTML = ''
        + '<a href="login.html"><button class="btn-sm">🔑 登录</button></a>'
        + '<a href="register.html"><button class="btn-sm">📝 注册</button></a>';
      if (skinInfo) skinInfo.textContent = '当前皮肤：经典木纹';
    }
  }

  // 从 localStorage 恢复 token
  App.token = localStorage.getItem('sm_token') || null;

  if (App.token) {
    App.api('/auth/me').then(function(data) {
      if (data.user) {
        App.user = data.user;
      } else {
        App.token = null;
        localStorage.removeItem('sm_token');
      }
      updateUI();
    });
  } else {
    updateUI();
  }

  // 退出登录
  App.logout = function() {
    delete App.token;
    App.user = null;
    localStorage.removeItem('sm_token');
    updateUI();
    App.UI.toast('👋 已退出登录');
  };
})();
