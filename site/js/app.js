// 主逻辑：路由 + 英语空间中控 + 词汇(间隔重复) + 口语(跟读/话题) + 统计 + 设置
(function () {
  "use strict";

  var WORD_LISTS = window.WORD_LISTS || {};
  var SPEAKING = window.SPEAKING_DATA || { shadowing: [], topics: [] };
  var Store = window.Store, SRS = window.SRS, Audio2 = window.Audio2;
  var SCENES = window.SCENES || [];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var currentSceneId = null;

  // ---------- 主题 / 初始化 ----------
  function applyTheme() {
    var t = Store.getSettings().theme;
    document.body.classList.toggle("theme-dark", t === "dark");
    document.body.classList.toggle("theme-light", t !== "dark");
  }
  function updateStreak() {
    var c = Store.bumpStreak();
    var el = $("#header-streak"); if (el) el.textContent = "🔥 " + c + " 天";
  }

  // ---------- 路由 ----------
  var views = ["space", "scene", "vocab", "speak", "stats", "settings"];
  function go(name) {
    if (name === "scene" && !currentSceneId) name = "space";
    views.forEach(function (v) {
      var el = $("#view-" + v); if (el) el.hidden = (v !== name);
    });
    $$(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-go") === name); });
    if (name === "space") renderSpace();
    else if (name === "vocab") renderVocab();
    else if (name === "speak") renderSpeak();
    else if (name === "stats") renderStats();
    else if (name === "settings") renderSettings();
    window.scrollTo(0, 0);
  }

  function openScene(id) {
    currentSceneId = id;
    views.forEach(function (v) { var el = $("#view-" + v); if (el) el.hidden = (v !== "scene"); });
    $$(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-go") === "space"); });
    window.Scene.open(id, $("#view-scene"), { onBack: function () { go("space"); } });
  }

  // ---------- 英语空间中控 ----------
  function renderSpace() {
    var cards = SCENES.map(function (s) {
      return '<button class="scene-card" data-id="' + s.id + '" style="background:' + s.gradient + '">' +
        '<div class="sc-emoji">' + s.emoji + "</div>" +
        '<div class="sc-title">' + esc(s.title) + "</div>" +
        '<div class="sc-tag">' + esc(s.tagline) + "</div>" +
        '<div class="sc-goals">🎯 ' + (s.goals || []).slice(0, 2).join(" · ") + "</div>" +
        "</button>";
    }).join("");
    $("#scene-cards").innerHTML = cards;
    $("#scene-cards").onclick = function (e) {
      var c = e.target.closest(".scene-card"); if (c) openScene(c.getAttribute("data-id"));
    };

    var mods = [
      { go: "vocab", emoji: "📚", title: "词汇复习", desc: "间隔重复 · 生词本" },
      { go: "speak", emoji: "🎤", title: "口语练习", desc: "跟读对比 · 每日话题" },
      { go: "stats", emoji: "📈", title: "学习统计", desc: "进度 · 连续天数" },
      { go: "settings", emoji: "⚙️", title: "设置", desc: "词库 · 主题 · AI密钥" }
    ];
    $("#mod-cards").innerHTML = mods.map(function (m) {
      return '<button class="mod-card" data-go="' + m.go + '">' +
        '<div class="m-emoji">' + m.emoji + "</div>" +
        '<div><div class="m-title">' + m.title + '</div><div class="m-desc">' + m.desc + "</div></div>" +
        "</button>";
    }).join("");
    $("#mod-cards").onclick = function (e) {
      var c = e.target.closest(".mod-card"); if (c) go(c.getAttribute("data-go"));
    };
  }

  // ---------- 词汇复习 ----------
  var vocabState = { list: "daily", queue: [], idx: 0, flipped: false, session: 0 };
  function renderVocab() {
    var lists = [
      { id: "mine", name: "⭐ 生词本 (" + Store.getMyWords().length + ")" },
      { id: "daily", name: "日常高频" },
      { id: "cet4", name: "CET-4 四级" },
      { id: "cet6", name: "CET-6 六级" },
      { id: "ielts", name: "雅思/托福" }
    ];
    var goal = Store.getSettings().dailyGoal;
    var seg = lists.map(function (l) {
      return '<button data-list="' + l.id + '" class="' + (vocabState.list === l.id ? "active" : "") + '">' + l.name + "</button>";
    }).join("");
    var st = SRS.stats(vocabState.list, getVocabWords(vocabState.list));
    $("#view-vocab").innerHTML =
      '<div class="panel"><h3>📚 词汇复习</h3>' +
      '<div class="seg" id="vseg">' + seg + "</div>" +
      '<div class="row" style="margin-top:10px"><span class="muted">今日目标 ' + goal + ' 词 · 本库已学 ' + st.learned + "/" + st.total + "</span></div>" +
      '<div id="vcard"></div></div>';
    $("#vseg").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      vocabState.list = b.getAttribute("data-list"); renderVocab();
    };
    startVocabSession();
  }
  function getVocabWords(list) { return list === "mine" ? Store.getMyWords() : (WORD_LISTS[list] || []); }
  function startVocabSession() {
    var words = getVocabWords(vocabState.list);
    var goal = Store.getSettings().dailyGoal;
    vocabState.queue = SRS.getQueue(vocabState.list, words, goal);
    vocabState.idx = 0; vocabState.session = 0;
    renderCard();
  }
  function renderCard() {
    var c = $("#vcard"); if (!c) return;
    var word = vocabState.queue[vocabState.idx];
    if (!word) {
      c.innerHTML = '<div class="flashcard"><div class="fc-word">🎉</div><div class="fc-cn">本轮复习完成！</div>' +
        '<div class="muted">本会话练习 ' + vocabState.session + " 词</div>" +
        '<button class="btn-primary" id="vmore">再抽一轮</button></div>';
      var m = $("#vmore"); if (m) m.onclick = startVocabSession;
      return;
    }
    vocabState.flipped = false;
    c.innerHTML =
      '<div class="flashcard" id="fc">' +
        '<div class="fc-word">' + esc(word.w) + "</div>" +
        '<div class="fc-ph">' + esc(word.ph) + "</div>" +
        '<div class="fc-back" id="fcback" style="display:none">' +
          '<div class="fc-pos">' + esc(word.pos) + "</div>" +
          '<div class="fc-cn">' + esc(word.cn) + "</div>" +
          '<div class="fc-ex">' + esc(word.ex || "（暂无例句）") + "</div>" +
        "</div>" +
        '<div class="muted" id="fchint">点击卡片看释义 · 🔊朗读</div>' +
      "</div>" +
      '<div class="grades" id="grades" style="display:none">' +
        '<button class="g1" data-q="1">忘了</button>' +
        '<button class="g3" data-q="3">模糊</button>' +
        '<button class="g4" data-q="4">认识</button>' +
        '<button class="g5" data-q="5">熟记</button>' +
      "</div>";
    $("#fc").onclick = function () {
      vocabState.flipped = true;
      $("#fcback").style.display = "block";
      $("#fchint").textContent = "现在选个熟悉度 →";
      $("#grades").style.display = "flex";
    };
    $(".fc-word", c).onclick = function (e) { e.stopPropagation(); Audio2.speak(word.w); };
    $("#grades").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      SRS.review(vocabState.list, word.w, +b.getAttribute("data-q"));
      vocabState.session++;
      vocabState.idx++;
      renderCard();
    };
  }

  // ---------- 口语练习 ----------
  function similarity(a, b) {
    a = (a || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    b = (b || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    if (!a.length || !b.length) return 0;
    var sb = new Set(b), hit = a.filter(function (w) { return sb.has(w); }).length;
    return Math.round(100 * (2 * hit) / (a.length + b.length));
  }
  function renderSpeak() {
    var sh = SPEAKING.shadowing || [];
    var shHtml = sh.map(function (s, i) {
      return '<div class="speak-item" data-sh="' + i + '">' +
        '<div class="sp-en">' + esc(s.text) + "</div>" +
        '<div class="sp-cn">难度 L' + (s.level || 1) + " · 听后跟读</div>" +
        '<div class="speak-actions">' +
          '<button class="btn-ghost" data-act="play">🔊 听</button>' +
          '<button class="btn-primary" data-act="rec">🎤 跟读</button>' +
        '</div><div class="result-box" id="shres-' + i + '" style="display:none"></div></div>';
    }).join("");

    var tp = SPEAKING.topics || [];
    var tpHtml = tp.map(function (t, i) {
      var tips = (t.tips || []).map(function (x) { return '<span class="chip">' + esc(x) + "</span>"; }).join("");
      return '<div class="speak-item" data-tp="' + i + '">' +
        '<div class="sp-en">💡 ' + esc(t.title) + "</div>" +
        '<div class="sp-cn">' + esc(t.prompt || "") + "</div>" +
        (tips ? '<div class="chips">可包含：' + tips + "</div>" : "") +
        '<div class="speak-actions">' +
          '<button class="btn-primary" data-act="tp">🎤 开口说</button>' +
        '</div><div class="result-box" id="tpres-' + i + '" style="display:none"></div></div>';
    }).join("");

    $("#view-speak").innerHTML =
      '<div class="panel"><h3>🎤 跟读对比</h3>' + (shHtml || "<p class='muted'>暂无素材</p>") + "</div>" +
      '<div class="panel"><h3>💡 每日口语话题</h3>' + (tpHtml || "<p class='muted'>暂无素材</p>") + "</div>";

    $("#view-speak").onclick = function (e) {
      var act = e.target.getAttribute("data-act"); if (!act) return;
      var item = e.target.closest(".speak-item");
      if (act === "play") { Audio2.speak(sh[+item.getAttribute("data-sh")].text); return; }
      if (act === "rec") {
        var s = sh[+item.getAttribute("data-sh")];
        doRecognize(e.target, function (txt) {
          var box = $("#shres-" + item.getAttribute("data-sh"));
          var score = similarity(txt, s.text);
          box.style.display = "block";
          box.innerHTML = "你说：<b>" + esc(txt) + "</b><br>匹配度：" +
            '<span class="' + (score >= 70 ? "score-good" : "score-bad") + '">' + score + "%</span>" +
            (score >= 70 ? " 🎉 很棒！" : " 再听一遍跟读试试");
        });
        return;
      }
      if (act === "tp") {
        var t = tp[+item.getAttribute("data-tp")];
        doRecognize(e.target, function (txt) {
          var box = $("#tpres-" + item.getAttribute("data-tp"));
          box.style.display = "block";
          box.innerHTML = "你的回答：<b>" + esc(txt) + "</b><br><span class='muted'>已记录一次练习 ✦</span>";
          Store.markSpeaking("topic");
        });
      }
    };
  }
  function doRecognize(btn, cb) {
    if (!Audio2.isRecognitionSupported()) { alert("当前浏览器不支持语音识别，请用 Chrome / Edge 并允许麦克风。"); return; }
    if (btn) { btn.textContent = "🎙️…"; }
    Audio2.recognize({ onEnd: function () { if (btn) btn.textContent = "🎤 跟读"; } })
      .then(function (txt) { cb(txt); })
      .catch(function (err) { alert((err && err.message) || "识别失败"); if (btn) btn.textContent = "🎤 跟读"; });
  }

  // ---------- 统计 ----------
  function renderStats() {
    var mine = Store.getMyWords().length;
    var perList = ["daily", "cet4", "cet6", "ielts"].map(function (id) {
      var st = SRS.stats(id, WORD_LISTS[id] || []);
      return { id: id, learned: st.learned, total: st.total };
    });
    var sp = Store.getSpeaking();
    var html = '<div class="panel"><h3>📈 学习统计</h3>' +
      '<div class="stat-grid">' +
        '<div class="stat-box"><div class="num">' + Store.bumpStreak() + '</div><div class="lbl">连续学习(天)</div></div>' +
        '<div class="stat-box"><div class="num">' + mine + '</div><div class="lbl">生词本</div></div>' +
        '<div class="stat-box"><div class="num">' + (sp.shadowingDone || 0) + '</div><div class="lbl">跟读练习</div></div>' +
        '<div class="stat-box"><div class="num">' + (sp.topicDone || 0) + '</div><div class="lbl">话题练习</div></div>' +
      "</div></div>";
    html += '<div class="panel"><h3>各词库进度</h3>' + perList.map(function (p) {
      return '<div class="row"><span>' + ({ daily: "日常高频", cet4: "CET-4", cet6: "CET-6", ielts: "雅思/托福" }[p.id]) +
        '</span><span class="muted">' + p.learned + " / " + p.total + " 已掌握</span></div>";
    }).join("") + "</div>";
    $("#view-stats").innerHTML = html;
  }

  // ---------- 设置 ----------
  function renderSettings() {
    var s = Store.getSettings();
    var aiOn = !!(s.aiEndpoint && s.aiKey);
    $("#view-settings").innerHTML =
      '<div class="banner">💡 对话与词汇双提升：场景里说的每句话都会高亮生词，可加入「生词本」自动进入间隔重复。AI 自由对话需自带免费 API 密钥（OpenAI 兼容接口）。</div>' +
      '<div class="panel"><h3>⚙️ 基础设置</h3>' +
        '<div class="field"><label>主题</label><div class="seg" id="set-theme">' +
          '<button data-t="light" class="' + (s.theme !== "dark" ? "active" : "") + '">☀️ 浅色</button>' +
          '<button data-t="dark" class="' + (s.theme === "dark" ? "active" : "") + '">🌙 深色</button></div></div>' +
        '<div class="field"><label>每日目标词数</label><div class="seg" id="set-goal">' +
          [10, 20, 30, 50].map(function (g) { return '<button data-g="' + g + '" class="' + (s.dailyGoal === g ? "active" : "") + '">' + g + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><label>朗读语速</label><input type="range" id="set-rate" min="0.5" max="1.2" step="0.1" value="' + (s.ttsRate || 0.9) + '"><span class="muted" id="rateval">' + (s.ttsRate || 0.9) + "</span></div>" +
        '<div class="field"><label>朗读声音</label><select id="set-voice"></select></div>' +
      "</div>" +
      '<div class="panel"><h3>🤖 AI 自由对话（可选）</h3>' +
        '<div class="field"><label>API 接口地址</label><input type="text" id="ai-end" placeholder="https://api.openai.com/v1/chat/completions" value="' + esc(s.aiEndpoint || "") + '"><span class="hint">任何 OpenAI 兼容的 /chat/completions 接口</span></div>' +
        '<div class="field"><label>API 密钥</label><input type="password" id="ai-key" placeholder="sk-..." value="' + esc(s.aiKey || "") + '"><span class="hint">密钥仅保存在你本机浏览器，不会上传</span></div>' +
        '<div class="field"><label>模型名</label><input type="text" id="ai-model" placeholder="gpt-3.5-turbo" value="' + esc(s.aiModel || "") + '"></div>' +
        '<div class="row"><span class="muted">' + (aiOn ? "✅ 已配置，场景页可用「AI自由聊」" : "未配置，场景页仅剧本模式") + '</span>' +
        '<button class="btn-primary" id="ai-save">保存</button></div>' +
      "</div>" +
      '<div class="panel"><h3>🗑️ 数据</h3><div class="row"><span class="muted">清空所有学习进度与生词本</span><button class="btn-ghost" id="reset-all">重置</button></div></div>';

    $("#set-theme").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; Store.setSetting("theme", b.getAttribute("data-t")); applyTheme(); renderSettings(); };
    $("#set-goal").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; Store.setSetting("dailyGoal", +b.getAttribute("data-g")); renderSettings(); };
    $("#set-rate").oninput = function (e) { var v = +e.target.value; $("#rateval").textContent = v; Store.setSetting("ttsRate", v); };
    populateVoices(s.ttsVoice);
    $("#set-voice").onchange = function (e) { Store.setSetting("ttsVoice", e.target.value); };
    $("#ai-save").onclick = function () {
      Store.setSetting("aiEndpoint", $("#ai-end").value.trim());
      Store.setSetting("aiKey", $("#ai-key").value.trim());
      Store.setSetting("aiModel", $("#ai-model").value.trim());
      renderSettings();
    };
    $("#reset-all").onclick = function () { if (confirm("确定清空所有进度？")) { Store.resetAll(); renderSettings(); } };
  }
  function populateVoices(cur) {
    var sel = $("#set-voice"); if (!sel) return;
    var vs = Audio2.getVoices() || [];
    sel.innerHTML = '<option value="">自动选择</option>' + vs.map(function (v) {
      return '<option value="' + esc(v.name) + '"' + (v.name === cur ? " selected" : "") + ">" + esc(v.name) + " (" + esc(v.lang) + ")</option>";
    }).join("");
  }

  // ---------- 启动 ----------
  function init() {
    applyTheme(); updateStreak();
    if (window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = function () { if (!$("#view-settings").hidden) populateVoices(Store.getSettings().ttsVoice); };
    }
    $$(".nav-btn").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    go("space");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.App = { go: go, openScene: openScene };
})();
