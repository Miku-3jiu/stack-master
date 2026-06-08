// ============ 游戏引擎 v2 ============
App.Game = {
  canvas:null, ctx:null, W:0, H:0,
  blocks:[], cur:null, cut:null,
  score:0, best:0, combo:0,
  state:'menu', dir:1, speed:3,
  camY:0, tgtCamY:0, particles:[],
  difficulty:'normal',
  // 道具
  items:{slow:3,freeze:3,expand:3},
  itemUsed:{slow:false,freeze:false,expand:false},
  activeEffect:null, // {type, endTime}

  DIFF_PARAMS: {
    easy:   { label:'简单',  speed:2.0, blockW:0.52, threshold:4, emoji:'🟢' },
    normal: { label:'普通',  speed:3.0, blockW:0.45, threshold:2, emoji:'🟡' },
    hard:   { label:'困难',  speed:4.5, blockW:0.36, threshold:1, emoji:'🔴' }
  },

  init: function() {
    this.canvas = document.getElementById('c');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    var self = this;
    window.addEventListener('resize', function() { self.resize(); });
    this.canvas.addEventListener('click', function() { self.tap(); });
    this.canvas.addEventListener('touchstart', function(e) { e.preventDefault(); self.tap(); }, { passive:false });
    this.loop();
  },

  resize: function() {
    var r = document.getElementById('wrap').getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(1,0,0,1,0,0);
    this.ctx.scale(dpr, dpr);
  },

  setDifficulty: function(diff) {
    this.difficulty = diff;
    document.getElementById('diffLabel').textContent = this.DIFF_PARAMS[diff].emoji + ' ' + this.DIFF_PARAMS[diff].label;
    // 更新难度选择按钮
    var btns = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('diff-active', btns[i].dataset.diff === diff);
    }
  },

  start: function() {
    this.score = 0; this.combo = 0; this.camY = 0; this.tgtCamY = 0;
    this.blocks = []; this.cur = null; this.cut = null; this.particles = [];
    this.state = 'playing'; this.dir = 1;
    this.itemUsed = {slow:false, freeze:false, expand:false};
    this.activeEffect = null;

    var p = this.DIFF_PARAMS[this.difficulty];
    this.speed = p.speed;

    var bw = this.W * p.blockW, bd = bw * 0.7, bh = 28;
    this.blocks.push({ x:-bw/2, z:-bd/2, w:bw, d:bd, h:bh, y:0 });
    this.tgtCamY = bh - this.H * 0.45; this.camY = bh - this.H * 0.45;
    this.spawnBlock();

    App.UI.hideAll();
    document.getElementById('diffSelect').style.display = 'none';
    document.getElementById('itemBar').style.display = 'flex';
    this.updateHud();
    this.updateItemBar();
  },

  spawnBlock: function() {
    var prev = this.blocks[this.blocks.length - 1];
    var w = prev.w, d = prev.d;
    this.cur = { x:-this.W/2 - w, z:-d/2, w:w, d:d, h:28, y:prev.y + prev.h };
  },

  tap: function() {
    if (this.state !== 'playing' || !this.cur) return;
    this.drop();
  },

  useItem: function(type) {
    if (this.state !== 'playing') return;
    if (this.itemUsed[type]) { App.UI.toast('本局已使用过该道具'); return; }
    if (this.items[type] <= 0) { App.UI.toast('道具已用完'); return; }
    if (!App.token) { App.UI.toast('请先登录使用道具'); return; }

    var self = this;
    App.api('/user/items/use', { method:'POST', body:{itemType:type} }).then(function(data) {
      if (data.error) { App.UI.toast(data.error); return; }
      self.items[type] = data.remaining;
      self.itemUsed[type] = true;
      self.updateItemBar();
      self.applyEffect(type);
    });
  },

  applyEffect: function(type) {
    var self = this;
    App.UI.toast({slow:'🐢 减速5秒', freeze:'❄️ 冻结3秒', expand:'📏 平台扩展'}[type]);

    if (type === 'slow') {
      var origSpeed = this.speed;
      this.speed = origSpeed * 0.45;
      setTimeout(function() { self.speed = origSpeed; }, 5000);
    } else if (type === 'freeze') {
      this.activeEffect = { type:'freeze', endTime: Date.now() + 3000 };
      setTimeout(function() { self.activeEffect = null; }, 3000);
    } else if (type === 'expand') {
      var top = this.blocks[this.blocks.length - 1];
      this.blocks[this.blocks.length - 1] = {
        x: top.x - top.w * 0.25, z: top.z, w: top.w * 1.5, d: top.d, h: top.h, y: top.y
      };
      // 下一个方块也跟着变大
      if (this.cur) {
        var newW = top.w * 1.5;
        this.cur.w = newW;
        this.cur.d = top.d;
      }
    }
  },

  drop: function() {
    if (this.activeEffect && this.activeEffect.type === 'freeze' && Date.now() < this.activeEffect.endTime) {
      return; // 冻结中，不掉落
    }

    var cb = this.cur;
    var prev = this.blocks[this.blocks.length - 1];

    var ol = Math.max(prev.x, cb.x);
    var or = Math.min(prev.x + prev.w, cb.x + cb.w);
    var ow = or - ol;

    if (ow <= 2) {
      if (ow > 0) this.blocks.push({ x:ol, z:cb.z, w:ow, d:cb.d, h:cb.h, y:cb.y });
      this.endGame();
      return;
    }

    this.blocks.push({ x:ol, z:cb.z, w:ow, d:cb.d, h:cb.h, y:cb.y });

    // 碎片
    var exL = cb.x < prev.x ? prev.x - cb.x : 0;
    var exR = (cb.x + cb.w) > (prev.x + prev.w) ? (cb.x + cb.w) - (prev.x + prev.w) : 0;
    if (exL > 0 || exR > 0) {
      var fw = Math.max(exL, exR);
      var fx = exL > 0 ? cb.x : or;
      this.cut = { x:fx, z:cb.z, w:fw, d:cb.d, h:cb.h, y:cb.y, vx:(exL>0?-1:1)*4, vy:0, a:1 };
    }

    // 完美判定
    var t = this.DIFF_PARAMS[this.difficulty].threshold;
    if (Math.abs(cb.x - prev.x) < t && Math.abs((cb.x+cb.w) - (prev.x+prev.w)) < t) {
      this.combo++;
      this.score += this.combo;
      this.burst(cb.x + cb.w/2, cb.y);
      if (this.combo >= 3) this.popText(cb.x + cb.w/2, cb.y, '完美x' + this.combo + '!');
    } else {
      this.combo = 0;
      this.score++;
    }

    this.speed = Math.min(this.DIFF_PARAMS[this.difficulty].speed + this.score * 0.05, 8);
    this.tgtCamY = this.blocks[this.blocks.length - 1].y + 28 - this.H * 0.45;
    this.updateHud();
    this.spawnBlock();
  },

  endGame: function() {
    this.state = 'over'; this.cur = null; this.cut = null;
    if (this.score > this.best) { this.best = this.score; }

    document.getElementById('endScore').textContent = this.score;
    var diffBadge = this.DIFF_PARAMS[this.difficulty].emoji + ' ' + this.DIFF_PARAMS[this.difficulty].label;
    var bestEl = document.getElementById('endBest');
    var badgeEl = document.getElementById('endBadge');
    if (this.score >= this.best && this.score > 0) {
      bestEl.textContent = '👑 新纪录！(' + diffBadge + ')';
      badgeEl.innerHTML = '<span class="new-record">🏆 新纪录</span>';
    } else {
      bestEl.textContent = '最高 ' + this.best + ' 层 (' + diffBadge + ')';
      badgeEl.innerHTML = '';
    }
    document.getElementById('endUI').classList.add('on');
    document.getElementById('itemBar').style.display = 'none';

    // 显示复活按钮
    this.updateReviveBtn();

    App.submitScore(this.score, this.difficulty);

    // AI 教练分析
    var analysis = Coach.analyzeStack(this.score, this.difficulty, this.combo);
    Coach.render(analysis, 'coachPanel');

    this.updateHud();
  },

  updateReviveBtn: function() {
    var btn = document.getElementById('reviveBtn');
    if (!btn) return;
    if (!App.token || (App.reviveTokens || 0) <= 0) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-block';
      btn.textContent = '💖 复活续玩 (' + (App.reviveTokens || 0) + '个)';
    }
  },

  revive: function() {
    if (!App.token || (App.reviveTokens || 0) <= 0) {
      App.UI.toast('没有复活令牌，去商城购买吧');
      return;
    }
    var self = this;
    App.api('/user/use-revive', { method:'POST', body:{} }).then(function(data) {
      if (data.error) { App.UI.toast(data.error); return; }
      App.reviveTokens = data.remainingTokens;

      // 移除最后一个失败方块（如果存在）
      var last = self.blocks[self.blocks.length - 1];
      // 保留平台，只移除最失败的放置
      // 实际上 game over 时可能已经加了一个微小方块，移除它
      if (last && last.w <= 2) {
        self.blocks.pop();
      }

      // 生成新方块，继续游戏
      self.state = 'playing';
      self.itemUsed = self.itemUsed || {slow:false, freeze:false, expand:false};
      self.cut = null;
      self.spawnBlock();

      document.getElementById('endUI').classList.remove('on');
      document.getElementById('itemBar').style.display = 'flex';
      self.updateHud();
      self.updateItemBar();
      App.UI.toast('💖 已复活，继续挑战！');
    });
  },

  burst: function(wx, wy) {
    var sx = this.sx(wx, 0), sy = this.sy(wy);
    for (var i = 0; i < 14; i++) {
      this.particles.push({
        x:sx, y:sy, vx:(Math.random()-0.5)*6, vy:(Math.random()*-6)-2,
        life:1, dec:0.02+Math.random()*0.04, size:2+Math.random()*3
      });
    }
  },

  popText: function(wx, wy, text) {
    var el = document.createElement('div');
    el.className = 'combo-pop';
    el.textContent = text;
    el.style.left = this.sx(wx, 0) + 'px';
    el.style.top = (this.sy(wy) - 30) + 'px';
    document.getElementById('wrap').appendChild(el);
    setTimeout(function() { el.remove(); }, 800);
  },

  updateHud: function() {
    document.getElementById('hudS').textContent = '🏗️ ' + this.score;
    document.getElementById('hudB').textContent = '👑 ' + this.best;
  },

  updateItemBar: function() {
    var bar = document.getElementById('itemBar');
    if (!bar) return;
    var types = ['slow', 'freeze', 'expand'];
    var icons = {slow:'🐢', freeze:'❄️', expand:'📏'};
    var names = {slow:'减速', freeze:'冻结', expand:'扩展'};
    var html = '';
    for (var i = 0; i < types.length; i++) {
      var t = types[i];
      var used = this.itemUsed[t];
      var qty = this.items[t];
      html += '<button class="item-btn' + (used || qty <= 0 ? ' used' : '') + '" onclick="App.Game.useItem(\'' + t + '\')" ' + (used || qty <= 0 ? 'disabled' : '') + '>'
        + icons[t] + ' ' + names[t] + (used ? ' 已用' : ' x' + qty) + '</button>';
    }
    bar.innerHTML = html;
  },

  sx: function(x, z) { return this.W/2 + (x - z) * Math.cos(Math.PI/5); },
  sy: function(y)   { return this.H * 0.75 - y + this.camY; },

  drawBlock: function(b, alpha) {
    var ctx = this.ctx;
    var a = (alpha !== undefined) ? alpha : 1;
    ctx.globalAlpha = a;

    var skin = App.getSkin();
    var sy2 = this.sy(b.y);
    var fl  = { x:this.sx(b.x, b.z), y:sy2 };
    var fr  = { x:this.sx(b.x+b.w, b.z), y:sy2 };
    var bl  = { x:this.sx(b.x, b.z+b.d), y:sy2 };
    var br  = { x:this.sx(b.x+b.w, b.z+b.d), y:sy2 };
    var TF={x:fl.x,y:sy2-b.h},TFR={x:fr.x,y:sy2-b.h},TB={x:bl.x,y:sy2-b.h},TBR={x:br.x,y:sy2-b.h};

    ctx.fillStyle = skin.left;
    ctx.beginPath(); ctx.moveTo(fl.x,fl.y);ctx.lineTo(bl.x,bl.y);ctx.lineTo(TB.x,TB.y);ctx.lineTo(TF.x,TF.y);ctx.closePath();ctx.fill();
    ctx.fillStyle = skin.right;
    ctx.beginPath(); ctx.moveTo(fr.x,fr.y);ctx.lineTo(br.x,br.y);ctx.lineTo(TBR.x,TBR.y);ctx.lineTo(TFR.x,TFR.y);ctx.closePath();ctx.fill();
    ctx.fillStyle = skin.top;
    ctx.beginPath(); ctx.moveTo(fl.x,fl.y);ctx.lineTo(fr.x,fr.y);ctx.lineTo(TFR.x,TFR.y);ctx.lineTo(TF.x,TF.y);ctx.closePath();ctx.fill();
    ctx.fillStyle = this.lighten(skin.top, 25);
    ctx.beginPath(); ctx.moveTo(TF.x,TF.y);ctx.lineTo(TFR.x,TFR.y);ctx.lineTo(TBR.x,TBR.y);ctx.lineTo(TB.x,TB.y);ctx.closePath();ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5;
    var paths = [[fl,bl,TB,TF],[fr,br,TBR,TFR],[fl,fr,TFR,TF]];
    for (var p=0;p<paths.length;p++){
      ctx.beginPath(); ctx.moveTo(paths[p][0].x,paths[p][0].y);
      for(var q=1;q<4;q++) ctx.lineTo(paths[p][q].x,paths[p][q].y);
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  lighten: function(hex, amt) {
    return 'rgb(' + Math.min(255,parseInt(hex.slice(1,3),16)+amt)+','+Math.min(255,parseInt(hex.slice(3,5),16)+amt)+','+Math.min(255,parseInt(hex.slice(5,7),16)+amt)+')';
  },

  loop: function() {
    var self = App.Game;
    requestAnimationFrame(function() { self.loop(); });

    if (self.state === 'playing') {
      if (self.cur && (!self.activeEffect || self.activeEffect.type !== 'freeze' || Date.now() > self.activeEffect.endTime)) {
        self.cur.x += self.speed * self.dir;
        var maxR = self.W/2 - self.cur.w/2, maxL = -self.W/2 - self.cur.w/2;
        if (self.cur.x > maxR) { self.cur.x = maxR; self.dir = -1; }
        else if (self.cur.x < maxL) { self.cur.x = maxL; self.dir = 1; }
      }
      if (self.cut) {
        self.cut.y -= 0.5; self.cut.vy += 0.3;
        self.cut.vx += (self.cut.vx > 0 ? 0.1 : -0.1);
        self.cut.x += self.cut.vx; self.cut.a -= 0.02;
        if (self.cut.a <= 0) self.cut = null;
      }
      self.camY += (self.tgtCamY - self.camY) * 0.08;
    }

    for (var i = self.particles.length-1; i >= 0; i--) {
      var p = self.particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life-=p.dec;
      if(p.life<=0) self.particles.splice(i,1);
    }

    var ctx = self.ctx, skin = App.getSkin();
    ctx.fillStyle = skin.bg; ctx.fillRect(0, 0, self.W, self.H);
    var gY = self.sy(0);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (var i=-self.W;i<self.W;i+=30){
      ctx.beginPath(); ctx.moveTo(self.sx(i,-100),gY); ctx.lineTo(self.sx(i,100),gY); ctx.stroke();
    }
    for (var j=0;j<self.blocks.length;j++) self.drawBlock(self.blocks[j],1);
    if (self.cur) {
      var prev = self.blocks[self.blocks.length-1];
      var gol=Math.max(prev.x,self.cur.x),gor=Math.min(prev.x+prev.w,self.cur.x+self.cur.w);
      if(gol<gor){ctx.globalAlpha=0.15;self.drawBlock({x:gol,y:self.cur.y,z:self.cur.z,w:gor-gol,d:self.cur.d,h:self.cur.h},1);ctx.globalAlpha=1;}
      self.drawBlock(self.cur, 0.92);
    }
    if (self.cut) self.drawBlock(self.cut, self.cut.a);
    for (var k=0;k<self.particles.length;k++){
      var pk=self.particles[k]; ctx.globalAlpha=pk.life; ctx.fillStyle=skin.accent;
      ctx.beginPath(); ctx.arc(pk.x,pk.y,pk.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,gY);ctx.lineTo(self.W,gY);ctx.stroke();

    if (self.state === 'playing' && self.score < 3) {
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='15px sans-serif'; ctx.textAlign='center';
      ctx.fillText('👆 点击屏幕放下方块', self.W/2, self.H*0.85);
    }
    // 冻结效果提示
    if (self.activeEffect && self.activeEffect.type === 'freeze' && Date.now() < self.activeEffect.endTime) {
      ctx.fillStyle='rgba(100,200,255,0.4)'; ctx.font='20px sans-serif'; ctx.textAlign='center';
      ctx.fillText('❄️ 冻结中...', self.W/2, self.H*0.55);
    }
  }
};
