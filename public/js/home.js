// ============ 首页 / 游戏大厅初始化 ============
(function() {
  function updateUI() {
    var userRow = document.getElementById('userRow');
    if (App.user) {
      if (userRow) userRow.innerHTML = '<p style="color:#ffd700;">👤 ' + App.user.username + '</p>'
        + '<a href="profile.html"><button class="btn-sm">个人中心</button></a>'
        + '<button class="btn-sm" onclick="App.logout()">退出</button>';
    } else {
      if (userRow) userRow.innerHTML = '<a href="login.html"><button class="btn-sm">🔑 登录</button></a>'
        + '<a href="register.html"><button class="btn-sm">📝 注册</button></a>';
    }
  }

  App.token = localStorage.getItem('sm_token') || null;
  if (App.token) {
    App.api('/auth/me').then(function(data) {
      if (data.user) { App.user = data.user; }
      else { App.token = null; localStorage.removeItem('sm_token'); }
      updateUI();
    });
  } else { updateUI(); }

  App.logout = function() {
    delete App.token; App.user = null;
    localStorage.removeItem('sm_token');
    updateUI(); App.UI.toast('已退出');
  };
})();
