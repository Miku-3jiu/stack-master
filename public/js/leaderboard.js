// ============ 排行榜 ============
App.LB = {
  show: function() {
    var self = this;
    App.api('/leaderboard').then(function(data) {
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
          var isMe = App.user && lb[i].username === App.user.username;
          html += '<tr style="' + (isMe ? 'background:rgba(255,215,0,0.1);' : '') + '">'
            + '<td style="font-weight:700;width:44px;">' + r + '</td>'
            + '<td style="font-weight:700;">' + lb[i].username + '</td>'
            + '<td>' + lb[i].score + ' 层</td>'
            + '<td style="color:#666;font-size:11px;">' + ds + '</td>'
            + '</tr>';
        }
        html += '</table>';
      }
      document.getElementById('lbContent').innerHTML = html;
      App.UI.show('lbUI');
    });
  }
};
