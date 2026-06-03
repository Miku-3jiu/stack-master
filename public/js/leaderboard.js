// ============ 排行榜（支持多游戏） ============
App.LB = {
  currentGame: 'stack',

  show: function() {
    this.renderTabs();
    this.load('stack');
  },

  renderTabs: function() {
    var games = [
      {id:'stack', name:'🏗️ 叠塔'},
      {id:'memory', name:'🧠 翻牌'},
      {id:'reaction', name:'🎯 反应'},
      {id:'math', name:'🧮 算数'}
    ];
    var html = '';
    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      html += '<button class="btn-sm" onclick="App.LB.load(\'' + g.id + '\')" style="' + (this.currentGame===g.id?'border-color:#ffd700;color:#ffd700;':'') + '">' + g.name + '</button>';
    }
    document.getElementById('lbTabs').innerHTML = html;
    App.UI.show('lbUI');
  },

  load: function(gameType) {
    this.currentGame = gameType;
    this.renderTabs();
    var self = this;
    App.api('/leaderboard?game_type=' + gameType + '&difficulty=normal').then(function(data) {
      var lb = data.leaderboard || [];
      var html = '';
      if (lb.length === 0) {
        html = '<p class="lb-empty">还没有记录，快来玩第一把吧！</p>';
      } else {
        var medals = ['🥇','🥈','🥉'];
        html = '<table class="lb-table">';
        for (var i = 0; i < lb.length; i++) {
          var r = i < 3 ? medals[i] : ('#' + (i + 1));
          var dt = new Date(lb[i].date);
          var ds = (dt.getMonth()+1) + '/' + dt.getDate();
          html += '<tr><td style="font-weight:700;width:36px;">' + r + '</td>'
            + '<td>' + lb[i].username + '</td>'
            + '<td style="font-weight:700;">' + lb[i].score + '</td>'
            + '<td style="color:#666;font-size:11px;">' + ds + '</td></tr>';
        }
        html += '</table>';
      }
      document.getElementById('lbContent').innerHTML = html;
    });
  }
};
