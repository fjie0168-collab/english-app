// 本地存储 + SM-2 间隔重复算法
(function () {
  "use strict";

  var STORAGE_KEY = "english_app_state_v1";

  // ---------- 存储层 ----------
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var s = JSON.parse(raw);
      return deepMerge(defaults(), s);
    } catch (e) {
      console.warn("读取本地状态失败，使用默认值", e);
      return defaults();
    }
  }

  function defaults() {
    return {
      version: 1,
      settings: {
        theme: "light",          // light | dark
        listId: "daily",         // 当前词库
        dailyGoal: 20,           // 每日新学+复习目标
        ttsRate: 0.9,            // 朗读语速
        ttsVoice: ""             // 留空=自动选择
      },
      lists: {},                 // { listId: { word: card } }
      myWords: [],               // 生词本：场景词/收藏词 [{w,ph,pos,cn,ex,src}]
      speaking: { shadowingDone: 0, topicDone: 0, lastTopic: -1 },
      streak: { lastDate: "", count: 0 }
    };
  }

  function deepMerge(base, over) {
    if (typeof base !== "object" || base === null) return over;
    if (typeof over !== "object" || over === null) return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (var k in over) {
      if (!over.hasOwnProperty(k)) continue;
      if (typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k])) {
        out[k] = deepMerge(base[k], over[k]);
      } else {
        out[k] = over[k];
      }
    }
    return out;
  }

  var state = loadState();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("保存失败", e);
    }
  }

  // ---------- 卡片 / SRS ----------
  function cardKey(word) { return word; }

  function getCard(listId, word) {
    var ls = state.lists[listId];
    if (!ls || !ls[cardKey(word)]) {
      return { ef: 2.5, interval: 0, reps: 0, due: Date.now(), last: 0, learned: false };
    }
    return ls[cardKey(word)];
  }

  // quality: 0-5 （UI 映射：忘了=1, 模糊=3, 认识=4, 熟记=5）
  function review(listId, word, quality) {
    if (!state.lists[listId]) state.lists[listId] = {};
    var c = getCard(listId, word);
    var q = Math.max(0, Math.min(5, quality));

    if (q >= 3) {
      if (c.reps === 0) c.interval = 1;
      else if (c.reps === 1) c.interval = 6;
      else c.interval = Math.round(c.interval * c.ef);
      c.reps += 1;
    } else {
      c.reps = 0;
      c.interval = 1; // 遗忘后明天再练
    }

    c.ef = c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (c.ef < 1.3) c.ef = 1.3;

    c.last = Date.now();
    c.due = Date.now() + c.interval * 24 * 3600 * 1000;
    c.learned = (c.reps >= 3 && c.interval >= 21);

    state.lists[listId][cardKey(word)] = c;
    save();
    return c;
  }

  // ---------- 生词本（场景词 / 收藏） ----------
  function addMyWord(item) {
    if (!item || !item.w) return false;
    var w = item.w.toLowerCase();
    if (state.myWords.some(function (x) { return x.w.toLowerCase() === w; })) return false;
    state.myWords.push({
      w: item.w, ph: item.ph || "", pos: item.pos || "",
      cn: item.cn || "", ex: item.ex || "", src: item.src || "生词本"
    });
    save();
    return true;
  }
  function getMyWords() { return state.myWords; }
  function removeMyWord(word) {
    var w = (word || "").toLowerCase();
    state.myWords = state.myWords.filter(function (x) { return x.w.toLowerCase() !== w; });
    save();
  }

  function resetWord(listId, word) {
    if (state.lists[listId]) delete state.lists[listId][cardKey(word)];
    save();
  }

  function resetList(listId) {
    state.lists[listId] = {};
    save();
  }

  // 取待复习队列：到期的 + 未学过的(新词)，上限 limit
  function getQueue(listId, words, limit) {
    limit = limit || 9999;
    var due = [], fresh = [];
    var now = Date.now();
    var ls = state.lists[listId] || {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i].w;
      var c = ls[w];
      if (!c) { fresh.push(words[i]); }
      else if (c.due <= now) { due.push(words[i]); }
    }
    // 到期优先，其次新词
    return due.concat(fresh).slice(0, limit);
  }

  function stats(listId, words) {
    var ls = state.lists[listId] || {};
    var learned = 0, due = 0, reviewing = 0, fresh = 0;
    var now = Date.now();
    for (var i = 0; i < words.length; i++) {
      var c = ls[words[i].w];
      if (!c) { fresh++; continue; }
      if (c.learned) learned++;
      else if (c.due <= now) due++;
      else reviewing++;
    }
    return {
      total: words.length,
      learned: learned,
      due: due,
      reviewing: reviewing,
      fresh: fresh
    };
  }

  // ---------- 设置 / 统计 ----------
  function getSettings() { return state.settings; }
  function setSetting(k, v) { state.settings[k] = v; save(); }

  function markSpeaking(type) {
    if (type === "shadow") state.speaking.shadowingDone++;
    else if (type === "topic") state.speaking.topicDone++;
    save();
  }
  function getSpeaking() { return state.speaking; }

  function bumpStreak() {
    var today = new Date().toISOString().slice(0, 10);
    var s = state.streak;
    if (s.lastDate === today) return s.count;
    var y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    s.count = (s.lastDate === y) ? s.count + 1 : 1;
    s.lastDate = today;
    save();
    return s.count;
  }

  function resetAll() {
    state = defaults();
    save();
  }

  window.Store = {
    getSettings: getSettings,
    setSetting: setSetting,
    getSpeaking: getSpeaking,
    markSpeaking: markSpeaking,
    bumpStreak: bumpStreak,
    resetAll: resetAll,
    resetList: resetList,
    resetWord: resetWord,
    addMyWord: addMyWord,
    getMyWords: getMyWords,
    removeMyWord: removeMyWord
  };
  window.SRS = {
    getCard: getCard,
    review: review,
    getQueue: getQueue,
    stats: stats
  };
})();
