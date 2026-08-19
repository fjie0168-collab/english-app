// 语音能力封装：语音合成(TTS) + 语音识别(Web Speech API)
(function () {
  "use strict";

  var synth = window.speechSynthesis;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function isTTSSupported() { return !!synth; }
  function isRecognitionSupported() { return !!SR; }

  var currentUtter = null;

  function pickVoice() {
    if (!synth) return null;
    var voices = synth.getVoices();
    if (!voices.length) return null;
    var pref = (window.Store && window.Store.getSettings().ttsVoice) || "";
    if (pref) {
      var v = voices.find(function (x) { return x.name === pref; });
      if (v) return v;
    }
    // 优先英语（美/英）女声
    var en = voices.filter(function (v) { return /^en(-|)/i.test(v.lang); });
    var prefer = en.find(function (v) { return /female|samantha|zira|google us|united states/i.test(v.name); })
      || en.find(function (v) { return /us|america|united states/i.test(v.lang + v.name); })
      || en[0];
    return prefer || voices[0];
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!synth) { return false; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var rate = (window.Store && window.Store.getSettings().ttsRate) || 0.9;
    u.rate = opts.rate || rate;
    u.lang = "en-US";
    var v = pickVoice();
    if (v) u.voice = v;
    currentUtter = u;
    synth.speak(u);
    if (opts.onend) u.onend = opts.onend;
    return true;
  }

  function stop() {
    if (synth) synth.cancel();
    currentUtter = null;
  }

  function getVoices() {
    if (!synth) return [];
    return synth.getVoices();
  }

  // 语音识别：返回 Promise<transcript>
  // opts.onStart / opts.onEnd 可选回调
  function recognize(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!SR) {
        reject(new Error("当前浏览器不支持语音识别（建议用 Chrome / Edge）。"));
        return;
      }
      var rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      var done = false;
      rec.onstart = function () { if (opts.onStart) opts.onStart(); };
      rec.onresult = function (e) {
        done = true;
        var txt = "";
        try { txt = e.results[0][0].transcript; } catch (err) { txt = ""; }
        resolve(txt);
      };
      rec.onerror = function (e) {
        done = true;
        reject(new Error(recognizeErrorText(e.error)));
      };
      rec.onend = function () {
        if (opts.onEnd) opts.onEnd();
        if (!done) reject(new Error("没有检测到语音，请再试一次。"));
      };
      try {
        rec.start();
      } catch (e) {
        reject(new Error("无法启动语音识别：" + (e && e.message ? e.message : e)));
      }
    });
  }

  function recognizeErrorText(code) {
    switch (code) {
      case "not-allowed":
      case "service-not-allowed":
        return "麦克风权限被拒绝，请在浏览器地址栏允许麦克风访问。";
      case "no-speech":
        return "没有检测到语音，请靠近麦克风再试。";
      case "audio-capture":
        return "未找到麦克风设备。";
      case "network":
        return "语音识别需要网络，请检查连接。";
      default:
        return "语音识别出错：" + (code || "未知错误");
    }
  }

  window.Audio2 = {
    isTTSSupported: isTTSSupported,
    isRecognitionSupported: isRecognitionSupported,
    speak: speak,
    stop: stop,
    getVoices: getVoices,
    recognize: recognize
  };
})();
