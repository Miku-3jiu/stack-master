// ============ 游戏页初始化 ============
(function() {
  App.token = localStorage.getItem('sm_token') || null;

  function initGame() {
    App.Game.init();
    App.Game.best = parseInt(localStorage.getItem('sm_best') || '0', 10);
    App.Game.setDifficulty('normal');
    App.Game.updateHud();
    App.UI.show('startUI');

    // 加载道具和复活令牌
    if (App.token) {
      App.api('/user/items').then(function(data) {
        if (data.items) App.Game.items = data.items;
        if (data.reviveTokens !== undefined) App.reviveTokens = data.reviveTokens;
        App.Game.updateItemBar();
      });
    }

    // 提交分数
    App.submitScore = function(score, difficulty) {
      localStorage.setItem('sm_best', Math.max(App.Game.best, score));
      if (!App.token) return;
      App.api('/leaderboard', { method:'POST', body:{ score:score, difficulty:difficulty } })
        .then(function(data) {
          if (data.best) {
            document.getElementById('endBest').textContent = '最高 ' + data.best.score + ' 层 | 排名 #' + data.best.rank;
          }
          // 显示新成就
          if (data.newAchievements && data.newAchievements.length > 0) {
            var achNames = {
              'first_game':'初次尝试','score_10':'初出茅庐','score_30':'小有成就','score_50':'堆塔高手',
              'score_80':'出神入化','score_100':'叠塔大师','hard_20':'迎难而上','hard_40':'绝境求生',
              'play_10':'常驻玩家','play_50':'忠实玩家','layers_100':'积少成多','layers_500':'坚持不懈','layers_1000':'万里长城'
            };
            var names = [];
            for (var i = 0; i < data.newAchievements.length; i++) {
              names.push('🏆 ' + (achNames[data.newAchievements[i]] || data.newAchievements[i]));
            }
            document.getElementById('achPopup').innerHTML = '<p style="color:#ffd700;font-size:13px;">' + names.join('<br>') + '</p>';
          }
        }).catch(function() {});
    };
  }

  if (App.token) {
    App.api('/auth/me').then(function(data) {
      if (data.user) {
        App.user = data.user;
      } else {
        App.token = null; localStorage.removeItem('sm_token');
      }
      initGame();
    });
  } else {
    initGame();
  }
})();
