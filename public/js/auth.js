// ============ 鉴权状态管理 ============

App.token = null;
App.user = null;

// 页面加载时调用，从 localStorage 恢复并验证 token
App.restoreAuth = function(onDone) {
  App.token = localStorage.getItem('sm_token') || null;
  if (!App.token) {
    if (onDone) onDone();
    return;
  }
  App.api('/auth/me').then(function(data) {
    if (data.user) {
      App.user = data.user;
    } else {
      App.token = null;
      localStorage.removeItem('sm_token');
    }
    if (onDone) onDone();
  });
};

// 退出登录
App.logout = function() {
  delete App.token;
  App.user = null;
  localStorage.removeItem('sm_token');
};
