// ============ 配置和常量 ============
var App = window.App || {};

// API 基础路径
App.API_BASE = '/api';

// 皮肤数据（颜色信息用于渲染）
App.SKINS = [
  { id:'classic', name:'经典木纹',  price:0, emoji:'🪵', top:'#d4a574', left:'#b8733b', right:'#9a5f2f', bg:'#2d1f14', accent:'#8b5e3c' },
  { id:'neon',    name:'霓虹之夜',  price:3, emoji:'🌃', top:'#ff00ff', left:'#cc00cc', right:'#990099', bg:'#0a0a1a', accent:'#ff6fff' },
  { id:'cyber',   name:'赛博朋克',  price:3, emoji:'🤖', top:'#faff00', left:'#c8cc00', right:'#969900', bg:'#0d0d0d', accent:'#faff00' },
  { id:'catpaw',  name:'猫爪肉球',  price:3, emoji:'🐾', top:'#ffb3ba', left:'#ff8088', right:'#e6646e', bg:'#fff0f0', accent:'#ff8088' },
  { id:'golden',  name:'金色传说',  price:6, emoji:'👑', top:'#ffd700', left:'#e6c200', right:'#b8960f', bg:'#1a1400', accent:'#ffea00' }
];

// 获取当前皮肤
App.getSkin = function() {
  var active = App.user ? App.user.activeSkin : 'classic';
  for (var i = 0; i < App.SKINS.length; i++) {
    if (App.SKINS[i].id === active) return App.SKINS[i];
  }
  return App.SKINS[0];
};

// 通用 API 请求（带 Token）
App.api = function(path, options) {
  var opts = options || {};
  var headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  if (App.token) {
    headers['Authorization'] = 'Bearer ' + App.token;
  }
  return fetch(App.API_BASE + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function(res) {
    if (res.status === 401) {
      delete App.token;
      localStorage.removeItem('sm_token');
      App.user = null;
    }
    return res.json();
  }).catch(function(err) {
    console.error('API error:', path, err.message);
    return { error: '网络异常，请稍后重试' };
  });
};
