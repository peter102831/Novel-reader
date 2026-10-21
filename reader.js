(function () {
  if (window.__novelReader) { window.__novelReader.show(); return; }

  var TTS_URL = 'https://novel-reader.a1028318.workers.dev/tts';
  var CLOUD_VOICES = [['zh-TW-HsiaoChenNeural', '曉臻（女聲）'], ['zh-TW-HsiaoYuNeural', '曉雨（女聲）'], ['zh-TW-YunJheNeural', '雲哲（男聲）']];

  var FIX = {}, FIXS = '괗二굛十굜丁궝七귷八그人극入깇九깊了꺅刀꺆力꺗又꺘三꺛干꺱土꺲工꺳才꺴寸꺵丈꺶大껗上께小껙口껚山껛巾껜千껡亡껣之껥已껦弓껧己껩也꼆乞꼇川꼊么꼋久꼌勺꼍丸꼎凡꼐及꽗叉꽬夫꽭天꽮元꽱扎꾉五꾊支꾦犬꾨尤꾩匹꾫巨꾬牙꾭屯꾮互꾿切꿀止꿁少꿂日꿗中꿛手꿢午꿤升꿦仁꿧片꿨化꿩仇꿫仍꿭斤꿮爪꿯反꿰介꿵父꿷今꿸凶꿹乏꿻氏뀐欠뀑丹뀔勾뀖六뀗文뀘方뀙火뀞心뀟尺뀧巴뀪以뀫允뀬予냪幻냫玉냬末냭未녈打녉巧녊正녌功녍扔녠甘녡世녢古녤本녦可녧丙녨左녪石녿右놀布놂平놅的놆是놇在놊不놋有놌和놖我놘由놙只놚要놛他뇽叫뇾用눁四눂失눃生누到눑代눒作눓地눕出늀就늁分늂乎늄令늅成늉句늌外늳冬늵包덿主뎀市뎃年돗它땡百땢同땣能땤而떘下떚子';
  for (var fi = 0; fi < FIXS.length; fi += 2) FIX[FIXS[fi]] = FIXS[fi + 1];
  var JUNK = /溫馨提示|网站即将改版|網站即將改版|及時保存|及时保存|請記住本站|请记住本站|本章未完|點擊下一頁|点击下一页/;
  var NEXT = /^\s*下一[章頁页节節]\s*$/;

  function fix(s) { return s.replace(/[가-힯]/g, function (c) { return FIX[c] || ''; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  function textLen(el) {
    var n = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      var c = el.childNodes[i];
      if (c.nodeType === 3) n += c.textContent.trim().length;
      else if (c.nodeName === 'P') n += c.textContent.trim().length;
    }
    return n;
  }

  function chunks(p, max) {
    var out = [], parts = p.match(/[^。！？!?；;…]+[。！？!?；;…」』”]*/g) || [p], buf = '';
    parts.forEach(function (s) {
      if ((buf + s).length > max && buf) { out.push(buf); buf = s; } else buf += s;
    });
    if (buf) out.push(buf);
    return out;
  }

  function extract(doc, url) {
    var best = null, bestN = 0;
    doc.querySelectorAll('div,article,section,main,td').forEach(function (el) {
      var n = textLen(el);
      if (n > bestN) { bestN = n; best = el; }
    });
    var paras = [];
    if (best) {
      var c = best.cloneNode(true);
      c.querySelectorAll('script,style,a,button,select,input').forEach(function (x) { x.remove(); });
      c.querySelectorAll('br').forEach(function (x) { x.replaceWith('\n'); });
      c.querySelectorAll('p,div').forEach(function (x) { x.append('\n'); });
      paras = fix(c.textContent).split(/\n+/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
        .filter(function (s) { return s && !JUNK.test(s); });
    }
    var next = null;
    var links = doc.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      if (NEXT.test(links[i].textContent)) {
        try { next = new URL(links[i].getAttribute('href'), url).href; } catch (e) {}
        break;
      }
    }
    if (next && (next === url || /\/(dir|index)?(\.html?)?$/i.test(next) || /\/dir/i.test(next))) next = null;
    var h = doc.querySelector('h1');
    var title = fix((h ? h.textContent : doc.title) || '').trim();
    var items = [], cur = null;
    paras.forEach(function (t, pIdx) {
      chunks(t, 300).forEach(function (s) {
        if (cur && cur.t.length + s.length + 1 <= 300) { cur.t += '\n' + s; cur.p2 = pIdx; }
        else { cur = { p: pIdx, p2: pIdx, t: s }; items.push(cur); }
      });
    });
    return { url: url, title: title, paras: paras, items: items, next: next };
  }

  function load(url) {
    return fetch(url, { credentials: 'include' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      return extract(new DOMParser().parseFromString(html, 'text/html'), url);
    });
  }

  var css = '#nr{position:fixed;inset:0;z-index:2147483647;background:#111;color:#f2f2f2;display:flex;flex-direction:column;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}' +
    '#nr-top{padding:12px 16px;font-size:18px;color:#ffd75e;border-bottom:1px solid #333}' +
    '#nr-body{flex:1;overflow-y:auto;padding:16px;line-height:1.8}' +
    '#nr-body p{margin:0 0 1em;padding:4px 6px;border-radius:6px}' +
    '#nr-body p.on{background:#2b3a55;color:#fff}' +
    '#nr-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px;padding-bottom:max(8px,env(safe-area-inset-bottom));background:#000;border-top:1px solid #333}' +
    '#nr-bar button{font-size:20px;min-height:58px;border:0;border-radius:10px;background:#333;color:#fff;font-weight:600}' +
    '#nr-bar button.big{background:#ffd75e;color:#000}' +
    '#nr-start{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);padding:24px}' +
    '#nr-start button{width:100%;max-width:420px;min-height:40vh;font-size:40px;font-weight:800;border:0;border-radius:24px;background:#ffd75e;color:#000;line-height:1.4}';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('div'); box.id = 'nr';
  box.innerHTML = '<div id="nr-start"><button type="button" aria-label="開始朗讀">▶<br>點這裡<br>開始朗讀</button></div><div id="nr-top" aria-live="polite"></div><div id="nr-body"></div><div id="nr-bar">' +
    '<button data-a="prev" aria-label="上一段">上一段</button><button data-a="play" class="big" aria-label="播放或暫停">暫停</button>' +
    '<button data-a="next" aria-label="下一段">下一段</button><button data-a="close" aria-label="關閉朗讀">關閉</button>' +
    '<button data-a="slow" aria-label="唸慢一點">慢一點</button><button data-a="fast" aria-label="唸快一點">快一點</button>' +
    '<button data-a="small" aria-label="字變小">字小</button><button data-a="large" aria-label="字變大">字大</button><button data-a="voice" aria-label="換聲音">換聲音</button></div>';
  document.body.appendChild(box);
  var top = box.querySelector('#nr-top'), body = box.querySelector('#nr-body'), playBtn = box.querySelector('[data-a=play]');

  var rate = parseFloat(store('nr-rate')) || 1.1, font = parseInt(store('nr-font'), 10) || 26;
  var ch = null, nextP = null, nextCh = null, idx = 0, playing = false, token = 0, wake = null, busy = false, loading = false, sayAt = 0;
  var cloud = true, cloudFails = 0, cvi = Math.max(0, CLOUD_VOICES.map(function (v) { return v[0]; }).indexOf(store('nr-cvoice')));
  var synth = window.speechSynthesis, voice = null, voices = [];

  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    voices = vs.filter(function (v) { return /zh[-_]TW/i.test(v.lang); }).concat(vs.filter(function (v) { return /zh|cmn|yue/i.test(v.lang) && !/zh[-_]TW/i.test(v.lang); }));
    var saved = store('nr-voice');
    voice = voices.find(function (v) { return v.name === saved; }) || voices[0] || null;
  }
  pickVoice(); if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = pickVoice;

  // ---------- audio ----------
  var players = [new Audio(), new Audio()], pc = 0, player = players[0];
  players.forEach(function (a) { a.preload = 'auto'; });
  function preloadNext(url) {
    var other = players[1 - pc];
    if (other.getAttribute('data-u') === url) return;
    other.setAttribute('data-u', url); other.src = url;
    try { other.load(); } catch (e) {}
  }
  var cache = new Map();
  function pct() { var n = Math.round((rate - 1) * 100); return (n >= 0 ? '+' : '') + n + '%'; }
  function audioFor(text) {
    var key = CLOUD_VOICES[cvi][0] + '|' + pct() + '|' + text;
    if (cache.has(key)) return cache.get(key);
    var url = TTS_URL + '?voice=' + CLOUD_VOICES[cvi][0] + '&rate=' + encodeURIComponent(pct()) + '&text=' + encodeURIComponent(text);
    var get = function () {
      return fetch(url).then(function (r) {
        if (!r.ok || !/audio/.test(r.headers.get('content-type') || '')) throw new Error('tts ' + r.status);
        return r.blob();
      }).then(function (b) { return URL.createObjectURL(b); });
    };
    var pr = get().catch(get);
    pr.catch(function () { cache.delete(key); });
    cache.set(key, pr);
    if (cache.size > 40) {
      var old = cache.keys().next().value, op = cache.get(old); cache.delete(old);
      op.then(function (u) { setTimeout(function () { URL.revokeObjectURL(u); }, 60000); }).catch(function () {});
    }
    return pr;
  }
  function prefetch() {
    if (!cloud || !ch) return;
    for (var k = 1; k <= 4; k++) {
      var j = idx + k;
      if (j < ch.items.length) {
        var pr = audioFor(ch.items[j].t);
        if (k === 1) pr.then(function (u) { if (!player.paused || loading) preloadNext(u); }).catch(function () {});
        else pr.catch(function () {});
      }
      else if (nextCh && nextCh.items[j - ch.items.length]) audioFor(nextCh.items[j - ch.items.length].t).catch(function () {});
    }
  }

  function deviceSay(text, my, done) {
    if (!synth) { done(); return; }
    var parts = chunks(text, 120), k = 0;
    synth.cancel();
    (function next() {
      if (my !== token || !playing) return;
      if (k >= parts.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(parts[k++]);
      u.lang = 'zh-TW'; if (voice) u.voice = voice; u.rate = rate;
      u.onend = u.onerror = function () { sayAt = Date.now(); next(); };
      synth.speak(u);
    })();
  }

  function say(text, done) {
    var my = ++token; sayAt = Date.now();
    var finish = function () { if (my === token && playing) done(); };
    if (synth) synth.cancel();
    if (!cloud) { player.pause(); deviceSay(text, my, finish); return; }
    loading = true;
    audioFor(text).then(function (url) {
      loading = false;
      if (my !== token || !playing) return;
      cloudFails = 0;
      var old = player;
      if (players[1 - pc].getAttribute('data-u') === url) { pc = 1 - pc; player = players[pc]; }
      old.onended = old.onerror = null;
      if (old !== player) old.pause();
      player.onended = finish;
      player.onerror = function () { if (my === token) deviceSay(text, my, finish); };
      if (player.getAttribute('data-u') !== url) { player.setAttribute('data-u', url); player.src = url; }
      else { try { player.currentTime = 0; } catch (e) {} }
      player.playbackRate = 1;
      var pp = player.play();
      if (pp) pp.catch(function () { if (my === token) deviceSay(text, my, finish); });
      sayAt = Date.now();
    }).catch(function () {
      loading = false;
      if (my !== token || !playing) return;
      if (++cloudFails >= 3) { cloud = false; status('雲端語音連不上，暫時改用手機語音'); }
      deviceSay(text, my, finish);
    });
  }

  // ---------- keep page alive in background ----------
  function silentUrl() {
    var sr = 8000, n = sr * 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function s(o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); }
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) v.setInt16(44 + i * 2, (i & 1) ? 1 : -1, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  var keep = new Audio(); keep.loop = true;
  try { keep.src = silentUrl(); } catch (e) {}
  function stalled() {
    if (!playing || busy || loading || !ch || idx >= ch.items.length) return false;
    if (Date.now() - sayAt < 8000) return false;
    return cloud ? player.paused : !(synth && (synth.speaking || synth.pending));
  }
  keep.addEventListener('timeupdate', function () { if (stalled()) step(); });
  function keepAwake() {
    if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (!playing) return;
    keepAwake();
    if (document.visibilityState === 'visible' && stalled()) step();
  });
  function media() {
    var ms = navigator.mediaSession; if (!ms) return;
    try {
      ms.metadata = new MediaMetadata({ title: ch ? ch.title : '小說朗讀', artist: '小說朗讀' });
      ms.playbackState = playing ? 'playing' : 'paused';
      ms.setActionHandler('play', function () { go(curP()); });
      ms.setActionHandler('pause', pause);
      ms.setActionHandler('nexttrack', function () { goItem(idx + 1); });
      ms.setActionHandler('previoustrack', function () { goItem(idx - 1); });
    } catch (e) {}
  }
  function pause() {
    playing = false; token++; if (synth) synth.cancel(); players.forEach(function (a) { a.pause(); }); keep.pause(); playBtn.textContent = '播放'; media();
    if (wake) wake.release().catch(function () {});
  }

  // ---------- reading ----------
  function voiceName() { return cloud ? CLOUD_VOICES[cvi][1] : '手機語音'; }
  function status(msg) { top.textContent = (ch ? ch.title : '') + '　' + voiceName() + '　語速 ' + rate.toFixed(1) + (msg ? '　' + msg : ''); }
  function applyFont() { body.style.fontSize = font + 'px'; }
  function curP() { return ch && ch.items[idx] ? ch.items[idx].p : 0; }

  function render() {
    body.innerHTML = '';
    ch.paras.forEach(function (t, i) {
      var p = document.createElement('p'); p.textContent = t;
      p.onclick = function () { go(i); };
      body.appendChild(p);
    });
    body.scrollTop = 0; document.title = ch.title; status(); media();
    try { if (location.origin === new URL(ch.url).origin) history.replaceState(null, '', ch.url); } catch (e) {}
    nextCh = null;
    nextP = ch.next ? load(ch.next).catch(function () { return load(ch.next); }) : null;
    if (nextP) nextP.then(function (c) { nextCh = c; }).catch(function () {});
  }

  var lastMarked = -1;
  function mark() {
    var it = ch.items[idx]; if (!it || idx === lastMarked) return; lastMarked = idx;
    var ps = body.children;
    for (var i = 0; i < ps.length; i++) ps[i].className = (i >= it.p && i <= it.p2) ? 'on' : '';
    if (ps[it.p]) ps[it.p].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function step() {
    if (!playing) return;
    if (idx >= ch.items.length) return nextChapter();
    mark();
    say(ch.items[idx].t, function () { idx++; step(); });
    prefetch();
  }

  function nextChapter() {
    if (!nextP) { status('已讀到最後一章'); say('已經是最後一章了', function () { pause(); }); return; }
    status('載入下一章…'); busy = true;
    nextP.then(function (c) {
      busy = false;
      if (!c.items.length) throw new Error('empty');
      ch = c; idx = 0; lastMarked = -1; render(); step();
    }).catch(function () {
      busy = false; status('下一章載入失敗');
      say('下一章載入失敗，請按播放再試一次', function () { pause(); });
      nextP = ch.next ? load(ch.next) : null;
    });
  }

  function go(p) {
    p = Math.max(0, Math.min(p, ch.paras.length - 1));
    idx = 0; while (idx < ch.items.length - 1 && ch.items[idx].p2 < p) idx++;
    lastMarked = -1; playing = true; playBtn.textContent = '暫停';
    keepAwake(); keep.play().catch(function () {}); media(); step();
  }

  function goItem(i) { i = Math.max(0, Math.min(i, ch.items.length - 1)); go(ch.items[i].p); idx = i; }
  box.querySelector('#nr-bar').onclick = function (e) {
    var a = e.target.getAttribute('data-a'); if (!a) return;
    if (a === 'play') { if (playing) pause(); else go(curP()); }
    if (a === 'prev') goItem(idx - 1);
    if (a === 'next') goItem(idx + 1);
    if (a === 'slow' || a === 'fast') { rate = Math.round(Math.max(0.5, Math.min(2, rate + (a === 'fast' ? 0.1 : -0.1))) * 10) / 10; store('nr-rate', rate); status(); if (playing) go(curP()); }
    if (a === 'voice') {
      if (cloud) {
        cvi = (cvi + 1) % CLOUD_VOICES.length; store('nr-cvoice', CLOUD_VOICES[cvi][0]);
      } else if (voices.length) {
        voice = voices[(voices.indexOf(voice) + 1) % voices.length]; store('nr-voice', voice.name);
      }
      status();
      if (playing) go(curP());
      else { playing = true; say('你好，我是' + voiceName().replace(/（.*/, '') + '，聽聽看喜不喜歡。', function () { pause(); }); }
      return;
    }
    if (a === 'small' || a === 'large') { font = Math.max(16, Math.min(48, font + (a === 'large' ? 2 : -2))); store('nr-font', font); applyFont(); }
    if (a === 'close') { pause(); box.style.display = 'none'; }
  };

  window.__novelReader = { show: function () { box.style.display = 'flex'; } };
  applyFont();
  ch = extract(document, location.href);
  if (!ch.paras.length) { top.textContent = '這個頁面找不到小說正文'; return; }
  render(); playBtn.textContent = '播放';
  audioFor(ch.items[0].t).catch(function () {});
  var startBox = box.querySelector('#nr-start');
  startBox.querySelector('button').onclick = function () { startBox.remove(); go(0); };
})();
