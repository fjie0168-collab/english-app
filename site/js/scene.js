// 场景对话引擎：渲染沉浸场景、运行脚本分支对话，并在配置后启用免费大模型自由对话
// 对话与词汇双提升：对话中高亮场景词、点击可听+释义；右侧场景词卡可加入复习；
// 剧本结束有"本场生词"回顾；AI 自由对话命中的场景词实时生成"＋收藏"芯片。
(function () {
  "use strict";

  var scene = null, nodes = [], nodeIdx = 0, mode = "script";
  var convoEl = null, goalsEl = null, vocabEl = null, ctrlEl = null, rootEl = null;
  var chatHistory = [], listening = false, aiBusy = false;
  var onBack = null;
  var vocabRe = null;

  function hasAIConfig() {
    var s = window.Store.getSettings();
    return !!(s.aiEndpoint && s.aiKey);
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 生成场景词高亮正则
  function buildVocabRe() {
    if (!scene || !scene.vocab || !scene.vocab.length) { vocabRe = null; return; }
    var words = scene.vocab.map(function (v) { return v.w; })
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    vocabRe = new RegExp("\\b(" + words.join("|") + ")\\b", "gi");
  }

  function hl(text) {
    text = escapeHtml(text);
    if (!vocabRe) return text;
    return text.replace(vocabRe, function (m) {
      return '<span class="vhl" data-w="' + escapeHtml(m) + '">' + m + "</span>";
    });
  }

  function findVocab(w) {
    if (!scene || !scene.vocab) return null;
    var lw = (w || "").toLowerCase();
    return scene.vocab.find(function (v) { return v.w.toLowerCase() === lw; }) || null;
  }

  function open(sceneId, root, opts) {
    opts = opts || {};
    onBack = opts.onBack || null;
    rootEl = root;
    scene = (window.SCENES || []).find(function (s) { return s.id === sceneId; });
    if (!scene) { root.innerHTML = "<p>场景不存在</p>"; return; }
    nodes = scene.script || [];
    nodeIdx = 0; mode = "script"; chatHistory = []; listening = false; aiBusy = false;
    buildVocabRe();
    renderShell();
    runScript(0);
  }

  function renderShell() {
    rootEl.innerHTML =
      '<div class="scene-shell" style="background:' + scene.gradient + '">' +
        '<div class="scene-top">' +
          '<button class="scene-back" id="sc-back">← 返回空间</button>' +
          '<div class="scene-title">' + scene.emoji + " " + escapeHtml(scene.title) + "</div>" +
          '<div class="scene-mode">' +
            '<span class="mode-label">模式</span>' +
            '<button class="mode-btn active" id="mode-script">📜 剧本</button>' +
            '<button class="mode-btn" id="mode-ai"' + (hasAIConfig() ? "" : " disabled title=\"在设置里填入免费API密钥后启用\"") + ">🤖 AI自由聊</button>" +
          "</div>" +
        "</div>" +
        '<div class="scene-setting">' + escapeHtml(scene.setting) + "</div>" +
        '<div class="scene-grid">' +
          '<div class="scene-main">' +
            '<div class="convo" id="convo"></div>' +
            '<div class="scene-ctrl" id="ctrl"></div>' +
          "</div>" +
          '<div class="scene-side">' +
            '<div class="card goals-card"><div class="card-h">🎯 任务目标</div><div class="goals" id="goals"></div></div>' +
            '<div class="card vocab-card"><div class="card-h">📚 场景词库 <span class="muted">（点击🔊听，＋加入复习）</span></div><div class="vocab-list" id="vocab"></div></div>' +
          "</div>" +
        "</div>" +
        '<div class="vtip" id="vtip" hidden></div>' +
      "</div>";

    convoEl = rootEl.querySelector("#convo");
    goalsEl = rootEl.querySelector("#goals");
    vocabEl = rootEl.querySelector("#vocab");
    ctrlEl = rootEl.querySelector("#ctrl");

    renderGoals();
    renderVocab();

    rootEl.querySelector("#sc-back").addEventListener("click", function () { if (onBack) onBack(); });
    rootEl.querySelector("#mode-script").addEventListener("click", switchToScript);
    rootEl.querySelector("#mode-ai").addEventListener("click", switchToAI);

    // 点击高亮词 -> 释义 + 朗读
    convoEl.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.classList.contains("vhl")) {
        var v = findVocab(t.getAttribute("data-w"));
        if (v) showVtip(v, t);
      }
    });
  }

  function renderGoals() {
    goalsEl.innerHTML = (scene.goals || []).map(function (g, i) {
      return '<label class="goal" data-i="' + i + '"><input type="checkbox" disabled> <span>' + escapeHtml(g) + "</span></label>";
    }).join("");
  }

  function tickGoals(arr) {
    (arr || []).forEach(function (i) {
      var el = goalsEl.querySelector('.goal[data-i="' + i + '"]');
      if (el) { el.classList.add("done"); var c = el.querySelector("input"); if (c) c.checked = true; }
    });
  }

  function renderVocab() {
    vocabEl.innerHTML = (scene.vocab || []).map(function (v, i) {
      return '<div class="vrow" data-i="' + i + '">' +
        '<button class="vspeak" title="朗读">🔊</button>' +
        '<div class="vmain"><b>' + escapeHtml(v.w) + '</b> <span class="muted">' + escapeHtml(v.ph) + " " + escapeHtml(v.pos) + "</span>" +
        '<div class="muted">' + escapeHtml(v.cn) + "</div>" +
        '<div class="vex">' + hl(v.ex) + "</div></div>" +
        '<button class="vadd" title="加入复习">＋</button>' +
        "</div>";
    }).join("");
    // 绑定事件（注意上面字符串里误写的引号，下面统一用事件委托更安全）
    vocabEl.addEventListener("click", function (e) {
      var row = e.target.closest(".vrow"); if (!row) return;
      var v = scene.vocab[+row.getAttribute("data-i")];
      if (e.target.classList.contains("vspeak")) { window.Audio2.speak(v.w); }
      else if (e.target.classList.contains("vadd")) {
        var ok = window.Store.addMyWord(v);
        e.target.textContent = ok ? "✓" : "✓";
        e.target.classList.add("added");
        if (!ok) e.target.title = "已在生词本";
      }
    });
  }

  // ---------- 剧本模式 ----------
  function runScript(i) {
    mode = "script";
    var node = nodes[i];
    if (!node) { return; }
    nodeIdx = i;
    if (node.end) { showEnd(); return; }
    if (node.npc) {
      appendBubble("npc", hl(node.text));
      window.Audio2.speak(node.text);
      setCtrlContinue(function () { runScript(i + 1); });
    } else if (node.you) {
      setCtrlUser(node);
    }
  }

  function setCtrlContinue(next) {
    ctrlEl.innerHTML = '<button class="btn-primary ctrl-next">继续 ▶</button>';
    ctrlEl.querySelector(".ctrl-next").addEventListener("click", function () {
      ctrlEl.innerHTML = ""; next();
    });
  }

  function setCtrlUser(node) {
    ctrlEl.innerHTML =
      '<div class="user-prompt">' +
        '<div class="up-hint">💬 试着说：<b>' + escapeHtml(node.hint) + "</b></div>" +
        '<div class="up-row">' +
          '<button class="mic-btn" id="mic">🎤</button>' +
          '<input class="up-input" id="upin" placeholder="或在这里打字…" autocomplete="off">' +
          '<button class="btn-primary" id="upsend">发送</button>' +
        "</div>" +
        '<div class="up-actions">' +
          '<button class="btn-ghost" id="upex">看示范</button>' +
          '<button class="btn-ghost" id="upskip">跳过 ▶</button>' +
        "</div>" +
        '<div class="up-fb" id="upfb"></div>' +
      "</div>";
    var mic = ctrlEl.querySelector("#mic");
    var input = ctrlEl.querySelector("#upin");
    var fb = ctrlEl.querySelector("#upfb");

    mic.addEventListener("click", function () {
      if (!window.Audio2.isRecognitionSupported()) { fb.textContent = "当前浏览器不支持语音识别，请直接打字（建议 Chrome / Edge）。"; return; }
      mic.classList.add("rec"); mic.textContent = "🎙️…";
      window.Audio2.recognize({
        onStart: function () { fb.textContent = "请开口说…"; },
        onEnd: function () { mic.classList.remove("rec"); mic.textContent = "🎤"; }
      }).then(function (txt) {
        input.value = txt; submitUser(txt, node, fb);
      }).catch(function (err) {
        fb.textContent = (err && err.message) || "识别失败";
      });
    });
    ctrlEl.querySelector("#upsend").addEventListener("click", function () {
      var t = input.value.trim(); if (t) submitUser(t, node, fb);
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var t = input.value.trim(); if (t) submitUser(t, node, fb); } });
    ctrlEl.querySelector("#upex").addEventListener("click", function () {
      fb.innerHTML = '示范：<b>' + escapeHtml(node.hint) + "</b>";
    });
    ctrlEl.querySelector("#upskip").addEventListener("click", function () {
      appendBubble("you", '<span class="muted">(跳过)</span>');
      tickGoals(node.achieves);
      ctrlEl.innerHTML = ""; runScript(nodeIdx + 1);
    });
  }

  function submitUser(text, node, fb) {
    var lower = text.toLowerCase();
    var matched = (node.expect || []).some(function (k) { return lower.indexOf(k) >= 0; });
    if (matched) {
      appendBubble("you", escapeHtml(text));
      tickGoals(node.achieves);
      ctrlEl.innerHTML = "";
      setTimeout(function () { runScript(nodeIdx + 1); }, 350);
    } else {
      fb.innerHTML = "🤔 没太匹配，试试这句：<b>" + escapeHtml(node.hint) + "</b>（或点「看示范」）";
      window.Audio2.speak(node.hint);
    }
  }

  function appendBubble(who, html) {
    var d = document.createElement("div");
    d.className = "bubble " + who;
    d.innerHTML = html;
    convoEl.appendChild(d);
    convoEl.scrollTop = convoEl.scrollHeight;
    return d;
  }

  function showEnd() {
    appendBubble("npc", hl(nodes[nodeIdx] && nodes[nodeIdx].text ? nodes[nodeIdx].text : "（完成）"));
    var doneGoals = goalsEl.querySelectorAll(".goal.done").length;
    var total = (scene.goals || []).length;
    ctrlEl.innerHTML =
      '<div class="end-box">' +
        '<div class="end-msg">🎉 场景完成！任务 ' + doneGoals + "/" + total + " 达成</div>" +
        '<button class="btn-primary" id="recap">📚 本场生词回顾</button>' +
        '<button class="btn-ghost" id="replay">↻ 再练一次</button>' +
      "</div>";
    ctrlEl.querySelector("#recap").addEventListener("click", showRecap);
    ctrlEl.querySelector("#replay").addEventListener("click", function () {
      goalsEl.querySelectorAll(".goal").forEach(function (g) { g.classList.remove("done"); var c = g.querySelector("input"); if (c) c.checked = false; });
      convoEl.innerHTML = ""; ctrlEl.innerHTML = ""; runScript(0);
    });
  }

  function showRecap() {
    var added = 0;
    var rows = (scene.vocab || []).map(function (v, i) {
      return '<div class="vrow" data-i="' + i + '">' +
        '<button class="vspeak" title="朗读">🔊</button>' +
        '<div class="vmain"><b>' + escapeHtml(v.w) + "</b> <span class=\"muted\">" + escapeHtml(v.ph) + " " + escapeHtml(v.pos) + "</span>" +
        '<div class="muted">' + escapeHtml(v.cn) + '</div><div class="vex">' + hl(v.ex) + "</div></div>" +
        '<button class="vadd" title="加入复习">＋</button></div>';
    }).join("");
    ctrlEl.innerHTML =
      '<div class="recap-box"><div class="card-h">📚 本场生词（' + (scene.vocab || []).length + '）</div>' +
      '<div class="vocab-list">' + rows + "</div>" +
      '<button class="btn-primary" id="addall">全部加入复习 ✦</button></div>';
    ctrlEl.querySelector(".vocab-list").addEventListener("click", function (e) {
      var row = e.target.closest(".vrow"); if (!row) return;
      var v = scene.vocab[+row.getAttribute("data-i")];
      if (e.target.classList.contains("vspeak")) { window.Audio2.speak(v.w); }
      else if (e.target.classList.contains("vadd")) {
        var ok = window.Store.addMyWord(v);
        e.target.textContent = "✓"; e.target.classList.add("added"); if (!ok) e.target.title = "已在生词本";
      }
    });
    ctrlEl.querySelector("#addall").addEventListener("click", function () {
      (scene.vocab || []).forEach(function (v) { if (window.Store.addMyWord(v)) added++; });
      ctrlEl.querySelector("#addall").textContent = "已加入 " + added + " 个生词 ✓";
      window.Store.bumpStreak();
    });
  }

  function showVtip(v, anchor) {
    var tip = rootEl.querySelector("#vtip");
    tip.innerHTML = "<b>" + escapeHtml(v.w) + "</b> " + escapeHtml(v.ph) + " " + escapeHtml(v.pos) +
      "<br>" + escapeHtml(v.cn) + "<br><span class='muted'>" + escapeHtml(v.ex) + "</span>" +
      "<button id='vtip-add'>＋加入复习</button>";
    tip.hidden = false;
    var r = anchor.getBoundingClientRect();
    tip.style.left = Math.min(r.left, window.innerWidth - 260) + "px";
    tip.style.top = (r.top + window.scrollY - 10) + "px";
    tip.querySelector("#vtip-add").addEventListener("click", function () {
      window.Store.addMyWord(v); tip.hidden = true;
      window.Audio2.speak(v.w);
    });
  }

  // ---------- AI 自由对话模式 ----------
  function switchToScript() {
    if (mode === "script") return;
    mode = "script";
    rootEl.querySelector("#mode-script").classList.add("active");
    rootEl.querySelector("#mode-ai").classList.remove("active");
    convoEl.innerHTML = ""; ctrlEl.innerHTML = ""; chatHistory = [];
    runScript(0);
  }

  function switchToAI() {
    if (!hasAIConfig()) { alert("请先在「设置」里填入免费的 API 密钥（OpenAI 兼容接口）再使用 AI 自由对话。"); return; }
    mode = "ai";
    rootEl.querySelector("#mode-ai").classList.add("active");
    rootEl.querySelector("#mode-script").classList.remove("active");
    convoEl.innerHTML = "";
    chatHistory = [{ role: "system", content:
      "You are a friendly local person in the scene '" + scene.title + "' (" + scene.setting + "). " +
      "The user is an English learner practicing conversation. Speak ONLY in simple, friendly English. " +
      "Keep replies short (1-3 sentences). Gently correct the user's grammar after your reply when they make mistakes, in a friendly way. Stay in character." }];
    appendBubble("npc", hl("Hi! I'm here in the " + scene.title + ". Let's chat in English — ask me anything! 😊"));
    setCtrlAI();
  }

  function setCtrlAI() {
    ctrlEl.innerHTML =
      '<div class="user-prompt">' +
        '<div class="up-row">' +
          '<button class="mic-btn" id="aimic">🎤</button>' +
          '<input class="up-input" id="aiin" placeholder="用英语说点什么，或打字…" autocomplete="off">' +
          '<button class="btn-primary" id="aisend">发送</button>' +
        "</div>" +
        '<div class="up-fb" id="aifb"></div>' +
      "</div>";
    var mic = ctrlEl.querySelector("#aimic");
    var input = ctrlEl.querySelector("#aiin");
    var fb = ctrlEl.querySelector("#aifb");
    mic.addEventListener("click", function () {
      if (!window.Audio2.isRecognitionSupported()) { fb.textContent = "当前浏览器不支持语音识别，请直接打字。"; return; }
      mic.classList.add("rec"); mic.textContent = "🎙️…";
      window.Audio2.recognize({ onEnd: function () { mic.classList.remove("rec"); mic.textContent = "🎤"; } })
        .then(function (txt) { input.value = txt; aiSend(txt); })
        .catch(function (err) { fb.textContent = (err && err.message) || "识别失败"; });
    });
    ctrlEl.querySelector("#aisend").addEventListener("click", function () { var t = input.value.trim(); if (t) aiSend(t); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var t = input.value.trim(); if (t) aiSend(t); } });
  }

  function aiSend(text) {
    if (aiBusy) return;
    aiBusy = true;
    appendBubble("you", escapeHtml(text));
    chatHistory.push({ role: "user", content: text });
    var fb = ctrlEl.querySelector("#aifb");
    fb.textContent = "对方正在输入…";
    callAI(chatHistory).then(function (reply) {
      chatHistory.push({ role: "assistant", content: reply });
      var b = appendBubble("npc", hl(reply));
      window.Audio2.speak(reply);
      renderAIVocabChips(b, reply);
      fb.textContent = "";
      aiBusy = false;
    }).catch(function (err) {
      fb.textContent = "⚠️ " + ((err && err.message) || "调用失败");
      aiBusy = false;
    });
  }

  function renderAIVocabChips(bubble, text) {
    var found = [];
    (scene.vocab || []).forEach(function (v) {
      if (new RegExp("\\b" + v.w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text)) found.push(v);
    });
    if (!found.length) return;
    var box = document.createElement("div");
    box.className = "chips";
    box.innerHTML = "<span class='muted'>本句生词：</span>" + found.map(function (v) {
      return '<button class="chip" data-w="' + escapeHtml(v.w) + '">＋ ' + escapeHtml(v.w) + "</button>";
    }).join("");
    bubble.appendChild(box);
    box.addEventListener("click", function (e) {
      if (!e.target.classList.contains("chip")) return;
      var v = findVocab(e.target.getAttribute("data-w"));
      if (v) { window.Store.addMyWord(v); e.target.textContent = "✓ " + v.w; e.target.disabled = true; }
    });
  }

  function callAI(messages) {
    var s = window.Store.getSettings();
    return fetch(s.aiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.aiKey },
      body: JSON.stringify({ model: s.aiModel || "gpt-3.5-turbo", messages: messages, temperature: 0.7 })
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error("API " + res.status + ": " + t.slice(0, 120)); });
      return res.json();
    }).then(function (data) {
      var c = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!c) throw new Error("返回格式异常");
      return c;
    });
  }

  window.Scene = { open: open, hasAIConfig: hasAIConfig };
})();
