// ============ AI 游戏教练 ============
var Coach = {

  // 分析堆叠大师
  analyzeStack: function(score, difficulty, combo) {
    var tips = [];
    var rating = '';
    var weaknesses = [];
    var strengths = [];

    if (difficulty === 'easy') {
      if (score < 10) {
        tips.push('新手期重在熟悉节奏，不要着急点击');
        tips.push('观察方块移动规律，在方块覆盖平台面积最大时点击');
        weaknesses.push('精准度偏低，建议先在简单模式建立手感');
        rating = '新手期';
      } else if (score < 25) {
        tips.push('你的基础不错，可以尝试普通模式了');
        tips.push('注意连续完美对齐的Combo加分机制');
        strengths.push('简单模式基本功扎实');
        weaknesses.push('需要挑战更高难度来突破瓶颈');
        rating = '入门级';
      } else {
        tips.push('简单模式已对你太轻松，建议升级到普通模式');
        strengths.push('节奏感非常好');
        strengths.push('简单模式已能稳定发挥');
        rating = '轻松碾压';
      }
    } else if (difficulty === 'normal') {
      if (score < 10) {
        tips.push('普通模式速度更快，建议先用简单模式练手');
        tips.push('善用道具：减速道具可以帮你渡过危险时刻');
        weaknesses.push('对普通难度的速度适应不足');
        rating = '需要练习';
      } else if (score < 30) {
        tips.push('你已掌握基本技巧，尝试追求完美对齐连击');
        tips.push('道具每局限用1次，在关键时候使用效果最佳');
        strengths.push('能适应普通难度节奏');
        weaknesses.push('完美率有待提高');
        rating = '稳步提升';
      } else {
        tips.push('厉害！可以挑战困难模式了');
        tips.push('你的精准度很高，连击Combo是你的加分利器');
        strengths.push('普通模式下表现优异');
        strengths.push('精准度和节奏感兼具');
        rating = '高手水平';
      }
    } else if (difficulty === 'hard') {
      if (score < 5) {
        tips.push('困难模式是真正的挑战，先熟练普通模式');
        weaknesses.push('需要降低难度练习基本功');
        rating = '挑战之路';
      } else if (score < 20) {
        tips.push('困难模式能坚持到这个分数已经很强了');
        tips.push('建议使用冻结道具在关键时刻暂停方块');
        strengths.push('有挑战困难的勇气');
        weaknesses.push('困难模式稳定性还需提升');
        rating = '勇者无畏';
      } else {
        tips.push('你是叠塔大师！可以考虑冲排行榜前三了');
        strengths.push('困难模式下表现惊艳');
        strengths.push('心理素质和操作精度双重优秀');
        rating = '大师级';
      }
    }

    return {
      game: '叠塔大师',
      rating: rating,
      strengths: strengths,
      weaknesses: weaknesses,
      tips: tips,
      summary: this.pick(tips) + '。' + this.pick(weaknesses)
    };
  },

  // 分析记忆翻牌
  analyzeMemory: function(time, moves, pairs) {
    var tips = [];
    var strengths = [];
    var weaknesses = [];
    var rating = '';
    var efficiency = time > 0 ? moves / time : 1;

    if (time < 30) {
      tips.push('你的记忆力非常出色！尝试挑战更少步数');
      strengths.push('记忆力和反应速度双优');
      rating = '记忆大师';
    } else if (time < 60) {
      tips.push('速度不错，可以尝试减少翻牌次数');
      tips.push('记住已翻牌的位置能大幅减少步数');
      rating = '记忆达人';
    } else if (time < 120) {
      tips.push('建议先翻四角卡片建立参照系');
      tips.push('每翻开一张就在心里默记位置');
      weaknesses.push('记忆策略可以更系统化');
      rating = '潜力股';
    } else {
      tips.push('不用急，这游戏比的是记忆不是速度');
      tips.push('试试给每张卡片编一个位置口诀');
      weaknesses.push('翻牌策略欠缺规划');
      rating = '入门期';
    }

    if (moves > 30) {
      weaknesses.push('翻牌步数偏多，记忆效率有提升空间');
      tips.push('目标：配对8组用不超过20步');
    } else if (moves <= 18) {
      strengths.push('翻牌效率极高，很少做无用功');
    }

    return {
      game: '记忆翻牌',
      rating: rating,
      strengths: strengths,
      weaknesses: weaknesses,
      tips: tips,
      summary: this.pick(tips) + '。' + (weaknesses.length ? this.pick(weaknesses) : '继续保持！')
    };
  },

  // 分析反应速度
  analyzeReaction: function(avgMs) {
    var tips = [];
    var strengths = [];
    var weaknesses = [];
    var rating = '';

    if (avgMs < 200) {
      tips.push('你的反应速度已经接近职业电竞选手水平（150-200ms）');
      tips.push('这个反应速度在任何游戏中都是巨大优势');
      strengths.push('反应速度达到顶尖水平');
      rating = '闪电反应';
    } else if (avgMs < 300) {
      tips.push('反应速度优秀，处于年轻人群体的前20%');
      tips.push('保持专注状态，你的潜力很大');
      strengths.push('反应速度快于大多数玩家');
      rating = '反应达人';
    } else if (avgMs < 400) {
      tips.push('你的反应速度在正常范围内，多练习可以提升');
      tips.push('尝试在做反应测试时保持指尖悬空准备点击');
      weaknesses.push('预判和准备动作可以更充分');
      rating = '潜力无限';
    } else {
      tips.push('反应速度偏慢不一定不好，可能你更擅长策略型游戏');
      tips.push('建议先玩叠塔大师和算数挑战来热身');
      weaknesses.push('反应速度有较大提升空间');
      rating = '新人起步';
    }

    return {
      game: '反应速度',
      rating: rating,
      strengths: strengths,
      weaknesses: weaknesses,
      tips: tips,
      summary: this.pick(tips) + '。' + (weaknesses.length ? this.pick(weaknesses) : '你的反射神经很棒！')
    };
  },

  // 分析算数挑战
  analyzeMath: function(correct, timeLimit) {
    var tips = [];
    var strengths = [];
    var weaknesses = [];
    var rating = '';
    var rate = correct / timeLimit;

    if (correct >= 12) {
      tips.push('你的心算能力非常强，可以闭眼秒答了');
      tips.push('尝试冲刺更高分：优先做简单题，难题快速跳过');
      strengths.push('心算速度和准确率双高');
      rating = '心算高手';
    } else if (correct >= 8) {
      tips.push('数学基础扎实，继续练习速度还能提升');
      tips.push('遇到不确定的答案可以排除法快速筛选');
      strengths.push('有一定数学功底');
      rating = '稳步提升';
    } else if (correct >= 4) {
      tips.push('建议先从简单加减法开始，慢慢提速');
      tips.push('数字运算需要练习，这也能锻炼你的思维敏捷度');
      weaknesses.push('心算准确率待提高');
      rating = '需要练习';
    } else {
      tips.push('别气馁，算数是所有游戏中最考验综合能力的');
      tips.push('每天玩几局不仅能提高分数，还能锻炼脑力');
      weaknesses.push('基础运算能力需要加强');
      rating = '入门阶段';
    }

    return {
      game: '算数挑战',
      rating: rating,
      strengths: strengths,
      weaknesses: weaknesses,
      tips: tips,
      summary: this.pick(tips) + '。' + (weaknesses.length ? this.pick(weaknesses) : '你的大脑就是计算器！')
    };
  },

  // 综合分析（多游戏数据）
  analyzeOverall: function(results) {
    var bestGame = null;
    var bestScore = 0;
    for (var game in results) {
      if (results[game].score > bestScore) {
        bestScore = results[game].score;
        bestGame = game;
      }
    }

    var suggestions = {
      stack: '你的精准度和耐心都很强，建议在叠塔大师冲击高排名',
      memory: '你的记忆力是你的核心优势，多刷记忆翻牌冲击纪录',
      reaction: '你的反应速度惊人，反应游戏是你的主场',
      math: '你的计算能力出众，算数挑战排行榜等你霸榜'
    };

    return {
      bestGame: bestGame,
      suggestion: suggestions[bestGame] || '多尝试不同游戏，找到你的最强项',
      recommend: this.pick(['试试还没玩过的游戏，发掘你的隐藏天赋！', '每个游戏锻炼的能力不同，轮流练习效果最佳'])
    };
  },

  pick: function(arr) {
    if (!arr || arr.length === 0) return '继续加油';
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // 渲染教练面板
  render: function(analysis, containerId) {
    var html = '<div style="background:rgba(100,80,255,0.08);border:1px solid rgba(100,80,255,0.2);border-radius:14px;padding:14px;margin:10px 0;text-align:left;">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
      + '<span style="font-size:24px;">🤖</span>'
      + '<span style="font-weight:700;color:#b8a8ff;">AI 教练分析</span>'
      + '<span style="font-size:11px;color:#666;">· ' + analysis.rating + '</span>'
      + '</div>'
      + '<p style="font-size:13px;color:#ccc;line-height:1.6;">' + analysis.summary + '</p>';

    if (analysis.strengths && analysis.strengths.length > 0) {
      html += '<p style="font-size:12px;color:#51cf66;margin-top:8px;">✅ 优点：' + analysis.strengths[0] + '</p>';
    }
    if (analysis.weaknesses && analysis.weaknesses.length > 0) {
      html += '<p style="font-size:12px;color:#ff6b6b;">⚠ 待提升：' + analysis.weaknesses[0] + '</p>';
    }
    html += '</div>';

    var container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  }
};
