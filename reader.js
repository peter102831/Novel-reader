(function () {
  if (window.__novelReader) { window.__novelReader.show(); return; }

  var FIX = {}, FIXS = '괗二굛十굜丁궝七귷八그人극入깇九깊了꺅刀꺆力꺗又꺘三꺛干꺱土꺲工꺳才꺴寸꺵丈꺶大껗上께小껙口껚山껛巾껜千껡亡껣之껥已껦弓껧己껩也꼆乞꼇川꼊么꼋久꼌勺꼍丸꼎凡꼐及꽗叉꽬夫꽭天꽮元꽱扎꾉五꾊支꾦犬꾨尤꾩匹꾫巨꾬牙꾭屯꾮互꾿切꿀止꿁少꿂日꿗中꿛手꿢午꿤升꿦仁꿧片꿨化꿩仇꿫仍꿭斤꿮爪꿯反꿰介꿵父꿷今꿸凶꿹乏꿻氏뀐欠뀑丹뀔勾뀖六뀗文뀘方뀙火뀞心뀟尺뀧巴뀪以뀫允뀬予냪幻냫玉냬末냭未녈打녉巧녊正녌功녍扔녠甘녡世녢古녤本녦可녧丙녨左녪石녿右놀布놂平놅的놆是놇在놊不놋有놌和놖我놘由놙只놚要놛他뇽叫뇾用눁四눂失눃生누到눑代눒作눓地눕出늀就늁分늂乎늄令늅成늉句늌外늳冬늵包덿主뎀市뎃年돗它땡百땢同땣能땤而떘下떚子';
  for (var fi = 0; fi < FIXS.length; fi += 2) FIX[FIXS[fi]] = FIXS[fi + 1];
  var JUNK = /溫馨提示|网站即将改版|網站即將改版|及時保存|及时保存|請記住本站|请记住本站|本章未完|點擊下一頁|点击下一页/;
  var NEXT = /^\s*下一[章頁页节節]\s*$/;

  function fix(s) { return s.replace(/[\uAC00-\uD7AF]/g, function (c) { return FIX[c] || ''; }); }
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
    return { url: url, title: title, paras: paras, next: next };
  }

  function load(url) {
    return fetch(url, { credentials: 'include' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      return extract(new DOMParser().parseFromString(html, 'text/html'), url);
    });
  }

  function chunks(p) {
    var out = [], parts = p.match(/[^。！？!?；;…]+[。！？!?；;…」』”]*/g) || [p], buf = '';
    parts.forEach(function (s) {
      if ((buf + s).length > 120 && buf) { out.push(buf); buf = s; } else buf += s;
    });
    if (buf) out.push(buf);
    return out;
  }

  var css = '#nr{position:fixed;inset:0;z-index:2147483647;background:#111;color:#f2f2f2;display:flex;flex-direction:column;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif}' +
    '#nr-top{padding:12px 16px;font-size:18px;color:#ffd75e;border-bottom:1px solid #333}' +
    '#nr-body{flex:1;overflow-y:auto;padding:16px;line-height:1.8}' +
    '#nr-body p{margin:0 0 1em;padding:4px 6px;border-radius:6px}' +
    '#nr-body p.on{background:#2b3a55;color:#fff}' +
    '#nr-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px;padding-bottom:max(8px,env(safe-area-inset-bottom));background:#000;border-top:1px solid #333}' +
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
    '<button data-a="small" aria-label="字變小">字小</button><button data-a="large" aria-label="字變大">字大</button></div>';
  document.body.appendChild(box);
  var top = box.querySelector('#nr-top'), body = box.querySelector('#nr-body'), playBtn = box.querySelector('[data-a=play]');

  var rate = parseFloat(store('nr-rate')) || 1.1, font = parseInt(store('nr-font'), 10) || 26;
  var ch = null, nextP = null, pi = 0, ci = 0, cks = [], playing = true, token = 0, wake = null, voice = null, busy = false, sayAt = 0;
  var synth = window.speechSynthesis;

  function pickVoice() {
    var vs = synth.getVoices();
    voice = vs.find(function (v) { return /zh[-_]TW/i.test(v.lang); }) || vs.find(function (v) { return /zh/i.test(v.lang); }) || null;
  }
  pickVoice(); if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = pickVoice;

  function keepAwake() {
    if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (!playing) return;
    keepAwake();
    if (document.visibilityState === 'visible' && !busy && !synth.speaking) say(cks[ci] || '', function () { ci++; step(); });
  });

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
  keep.addEventListener('timeupdate', function () {
    if (playing && !busy && !synth.speaking && !synth.pending && Date.now() - sayAt > 4000) say(cks[ci] || '', function () { ci++; step(); });
  });
  function media() {
    var ms = navigator.mediaSession; if (!ms) return;
    try {
      ms.metadata = new MediaMetadata({ title: ch ? ch.title : '小說朗讀', artist: '小說朗讀' });
      ms.playbackState = playing ? 'playing' : 'paused';
      ms.setActionHandler('play', function () { go(pi); });
      ms.setActionHandler('pause', pause);
      ms.setActionHandler('nexttrack', function () { go(pi + 1); });
      ms.setActionHandler('previoustrack', function () { go(pi - 1); });
    } catch (e) {}
  }
  function keepOn() { keep.play().catch(function () {}); media(); }
  function pause() {
    playing = false; token++; synth.cancel(); keep.pause(); playBtn.textContent = '播放'; media();
    if (wake) wake.release().catch(function () {});
  }

  function status(msg) { top.textContent = (ch ? ch.title : '') + '　語速 ' + rate.toFixed(1) + (msg ? '　' + msg : ''); }
  function applyFont() { body.style.fontSize = font + 'px'; }

  function render() {
    body.innerHTML = '';
    ch.paras.forEach(function (t, i) {
      var p = document.createElement('p'); p.textContent = t;
      p.onclick = function () { go(i); };
      body.appendChild(p);
    });
    body.scrollTop = 0; document.title = ch.title; status(); media();
    try { if (location.origin === new URL(ch.url).origin) history.replaceState(null, '', ch.url); } catch (e) {}
    nextP = ch.next ? load(ch.next).catch(function () { return load(ch.next); }) : null;
  }

  function mark() {
    var ps = body.children;
    for (var i = 0; i < ps.length; i++) ps[i].className = i === pi ? 'on' : '';
    if (ps[pi]) ps[pi].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function say(text, done) {
    var my = ++token; sayAt = Date.now();
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW'; if (voice) u.voice = voice; u.rate = rate;
    u.onend = u.onerror = function () { if (my === token && playing) done(); };
    synth.speak(u);
  }

  function step() {
    if (!playing) return;
    if (pi >= ch.paras.length) return nextChapter();
    if (ci === 0) { cks = chunks(ch.paras[pi]); mark(); }
    if (ci >= cks.length) { pi++; ci = 0; return step(); }
    say(cks[ci], function () { ci++; step(); });
  }

  function nextChapter() {
    if (!nextP) { status('已讀到最後一章'); say('已經是最後一章了', function () { pause(); }); return; }
    status('載入下一章…'); busy = true;
    nextP.then(function (c) {
      busy = false;
      if (!c.paras.length) throw new Error('empty');
      ch = c; pi = 0; ci = 0; render(); step();
    }).catch(function () {
      busy = false; status('下一章載入失敗');
      say('下一章載入失敗，請按播放再試一次', function () { pause(); });
      nextP = ch.next ? load(ch.next) : null;
    });
  }

  function go(i) { pi = Math.max(0, Math.min(i, ch.paras.length - 1)); ci = 0; playing = true; playBtn.textContent = '暫停'; keepAwake(); keepOn(); step(); }

  box.querySelector('#nr-bar').onclick = function (e) {
    var a = e.target.getAttribute('data-a'); if (!a) return;
    if (a === 'play') {
      if (playing) pause(); else go(pi);
    }
    if (a === 'prev') go(pi - 1);
    if (a === 'next') go(pi + 1);
    if (a === 'slow' || a === 'fast') { rate = Math.max(0.5, Math.min(2.5, rate + (a === 'fast' ? 0.1 : -0.1))); store('nr-rate', rate); status(); if (playing) go(pi); }
    if (a === 'small' || a === 'large') { font = Math.max(16, Math.min(48, font + (a === 'large' ? 2 : -2))); store('nr-font', font); applyFont(); }
    if (a === 'close') { pause(); box.style.display = 'none'; }
  };

  window.__novelReader = { show: function () { box.style.display = 'flex'; } };
  applyFont();
  ch = extract(document, location.href);
  if (!ch.paras.length) { top.textContent = '這個頁面找不到小說正文'; return; }
  render(); playing = false; playBtn.textContent = '播放';
  var startBox = box.querySelector('#nr-start');
  startBox.querySelector('button').onclick = function () { startBox.remove(); go(0); };
})();
