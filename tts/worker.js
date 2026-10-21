import CORE from '../reader.core.js';
// Edge TTS proxy for the novel reader. Deployed as a Cloudflare Worker.
// Optional: set a secret ACCESS_KEY in Cloudflare to require ?key=...
// GET  /tts?text=...&voice=zh-TW-HsiaoChenNeural&rate=%2B0%25  -> audio/mpeg
// POST /tts  {key, text, voice, rate}                                  -> audio/mpeg
// GET  /                                                               -> ok

// --- Sec-MS-GEC token (ported from rany2/edge-tts) ---
// Port of edge-tts (rany2/edge-tts, drm.py) Sec-MS-GEC v2 token generation.
const M = 0xFFFFFFFFn;
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WIN_EPOCH = 11644473600;

const H0 = [0x6A09E667n, 0xBB67AE85n, 0x3C6EF372n, 0xA54FF53An, 0x510E527Fn, 0x9B05688Cn, 0x1F83D9ABn, 0x5BE0CD19n];
const STATE = [0xFD9FBEA2n, 0x91243CE7n, 0xBE499094n, 0xCD2E1E0An, 0x6C006F49n, 0x04BD35ABn, 0xFEB0A7E4n, 0x03EFFBD2n];
const SCHED = [0xEB24BF9En, 0x1558691Fn, 0xA0C09EE2n, 0x0CFA32BAn, 0xA622EE8Cn, 0xD1DD9491n, 0xC0DD25A0n, 0xF9E70AB6n, 0xF0C31573n, 0x7058CE4En, 0x7188E606n, 0x00E5AB33n, 0xD258B060n, 0x72766564n];
const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2].map(BigInt);
const ADJ = 0xC9DC06A7n;
const KB = K.slice(0, 14).concat([ADJ], K.slice(15));
const SIG0_ADJ = 0x059C0B80n, SIG1_ADJ = 0x000B92C0n;
const CS64 = [[0xE82E91B1n, 0xB32700D0n], [0x44DE24C6n, 0x88DFF51Dn], [0x3BEB65BCn, 0x29514038n], [0xC89C5933n, 0xB328CBDFn], [0x8D1EC211n, 0xD405B4D5n], [0x314EF5D5n, 0x26E55F3Cn], [0xE92491B1n, 0x607801C6n], [0xF0A5B9D5n, 0x82B2C1FBn], [0x06064CF3n, 0xFA51A3DAn], [0xDA79FA60n, 0x207CC464n], [0xBED20560n, 0x3C3C74F3n], [0x89F9C9F8n, 0xD2D14B61n], [0x35FA38C6n, 0xBB04A2C1n], [0xCB49E3C6n, 0xC5626167n]];
const CS64_FACTOR = 0x82893933n, CS64_ADJ0 = 0xF2F90B1An, CS64_ADJ1 = 0x0B1A0000n;

const rol16 = v => { v &= M; return ((v << 16n) | (v >> 16n)) & M; };
const sigma0 = v => ((v >> 7n) ^ (v << 25n) ^ (v >> 18n) ^ (v << 14n) ^ (v >> 3n)) & M;
const sigma1 = v => ((v >> 17n) ^ (v << 15n) ^ (v >> 19n) ^ (v << 13n) ^ (v >> 10n)) & M;

function rounds(state, w, first) {
  let [a, b, c, d, e, f, g, h] = state;
  const k = first === 14 ? KB : K;
  for (let i = first; i < 64; i++) {
    const re = e * 0x100000001n, ra = a * 0x100000001n;
    const t1 = h + ((re >> 6n) ^ (re >> 11n) ^ (re >> 25n)) + (g ^ (e & (f ^ g))) + k[i] + w[i];
    const t2 = ((ra >> 2n) ^ (ra >> 13n) ^ (ra >> 22n)) + ((a & b) | (c & (a | b)));
    h = g; g = f; f = e; e = (d + t1) & M; d = c; c = b; b = a; a = (t1 + t2) & M;
  }
  return [a, b, c, d, e, f, g, h];
}

function expand(w, first) {
  for (let i = first; i < 64; i++) {
    const x = w[i - 2], y = w[i - 15];
    const s1 = (x >> 17n) ^ (x << 15n) ^ (x >> 19n) ^ (x << 13n) ^ (x >> 10n);
    const s0 = (y >> 7n) ^ (y << 25n) ^ (y >> 18n) ^ (y << 14n) ^ (y >> 3n);
    w.push((s1 + w[i - 7] + s0 + w[i - 16]) & M);
  }
}

const be = (bytes, off, n) => { let v = 0n; for (let i = 0; i < n; i++) v = (v << 8n) | BigInt(bytes[off + i] || 0); return v; };

function sha256Init(d7) {
  const w = new Array(14).fill(0n);
  w.push(be(d7, 0, 3)); w.push(be(d7, 3, 4));
  for (let i = 16; i < 30; i++) {
    let v = SCHED[i - 16];
    if (i - 2 >= 14) v += i === 16 ? (sigma1(w[i - 2]) ^ SIG1_ADJ) : sigma1(w[i - 2]);
    if (i - 7 >= 14) v += w[i - 7];
    if (i - 15 >= 14) v += i === 29 ? (sigma0(w[i - 15]) ^ SIG0_ADJ) : sigma0(w[i - 15]);
    w.push(v & M);
  }
  w.push((sigma1(w[28]) + w[23] + sigma0(w[15]) + w[14] + ADJ - K[14]) & M);
  expand(w, 31);
  const r = rounds(STATE, w, 14);
  return H0.map((x, i) => (x + r[i]) & M);
}

function sha256Digest(data) {
  const length = 57 + data.length;
  const padLen = ((55 - length) % 64 + 64) % 64;
  const rest = data.slice(7);
  const padded = new Uint8Array(rest.length + 1 + padLen + 8);
  padded.set(rest); padded[rest.length] = 0x80;
  let bits = BigInt(length * 8);
  for (let i = 0; i < 8; i++) padded[padded.length - 1 - i] = Number((bits >> BigInt(8 * i)) & 0xFFn);
  let state = sha256Init(data.slice(0, 7));
  for (let off = 0; off < padded.length; off += 64) {
    const w = []; for (let i = 0; i < 16; i++) w.push(be(padded, off + 4 * i, 4));
    expand(w, 16);
    const r = rounds(state, w, 0);
    state = state.map((x, i) => (x + r[i]) & M);
  }
  const out = new Uint8Array(32);
  state.forEach((v, i) => { for (let j = 0; j < 4; j++) out[i * 4 + j] = Number((v >> BigInt(24 - 8 * j)) & 0xFFn); });
  return out;
}

const le32 = (b, off) => BigInt(b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) + (BigInt(b[off + 3]) << 24n);

function cs64Digest(data, digest) {
  let ka = le32(digest, 0) | 1n, kb = le32(digest, 4) | 1n;
  const factors = [(ka * CS64_FACTOR) & M, (kb * CS64_FACTOR) & M];
  const terms = CS64.map((c, i) => (c[0] * factors[i % 2]) & M);
  const offsets = CS64.map(c => c[1]);
  const src = new Uint8Array(data.length + 1); src.set(data, 1);
  const padded = new Uint8Array(Math.ceil(src.length / 4) * 4); padded.set(src);
  const words = []; for (let i = 0; i < padded.length; i += 4) words.push(le32(padded, i));
  if (words.length % 2) words.push(0n);
  words.forEach((word, i) => {
    let term = word * (i % 2 === 0 ? ka : kb);
    let offset = rol16(word) * (i % 2 === 0 ? 0xEF0569FBn : 0xC31713DBn);
    if (i === 0) { term += CS64_ADJ0 * factors[0]; offset += CS64_ADJ1; }
    terms.push(term & M); offsets.push(offset & M);
  });
  let swapAcc = 0n, swapLast = 0n, state = 0n, acc = 0n;
  for (let i = 0; i < terms.length; i += 2) {
    const x = terms[i], y = terms[i + 1];
    let t = rol16((offsets[i] + x) & M), q = (t * 0x76F50F34n) & M;
    swapAcc += (rol16(q) * 0xC3EFEA97n + q) & M;
    t = rol16((offsets[i + 1] + y) & M); q = (t * 0x1881CE3Cn) & M;
    swapLast = (rol16(q) * 0x35BD1EC9n + q) & M;
    swapAcc = (swapAcc + swapLast) & M;
    state = (state * ka + x) & M;
    state = (rol16(state) * 0xCF98B111n) & M;
    state = (rol16(state) * 0x87085B9Fn) & M;
    state = (rol16(state) * 0x12CEB96Dn) & M;
    state = (rol16(state) * 0x257E1D83n) & M;
    acc += state;
    t = (state * kb + y) & M;
    t = (rol16(t) * 0xA27416F5n) & M;
    t = (rol16(t) * 0xD38396FFn) & M;
    state = (rol16((rol16(t) * 0x7C932B89n) & M) * 0xBFA49F69n) & M;
    acc = (acc + state) & M;
  }
  return [swapLast ^ state, swapAcc ^ acc];
}

const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('').toUpperCase();

function secMsGec(unixSeconds = Date.now() / 1000) {
  let t = unixSeconds + WIN_EPOCH;
  t -= t % 300;
  const ticks = (t * (1e9 / 100)).toFixed(0);
  const data = new TextEncoder().encode(ticks + TRUSTED_CLIENT_TOKEN);
  const digest = sha256Digest(data);
  const [c0, c1] = cs64Digest(data, digest);
  const cs = new Uint8Array(8);
  [c0, c1].forEach((v, i) => { for (let j = 0; j < 4; j++) cs[i * 4 + j] = Number((v >> BigInt(8 * j)) & 0xFFn); });
  return hex(cs) + '-' + hex(digest);
}

// --- service ---
const SEC_MS_GEC_VERSION = '2-143.0.3650.75';
const WSS = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stamp = () => new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');

async function synth(text, voice, rate) {
  const url = `${WSS}&ConnectionId=${rnd(16)}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  const resp = await fetch(url, {
    headers: {
      Upgrade: 'websocket', Pragma: 'no-cache', 'Cache-Control': 'no-cache',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold', 'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9', Cookie: `muid=${rnd(16).toUpperCase()};`,
    },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error('upstream refused websocket: ' + resp.status);
  ws.accept();
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('upstream timeout')), 30000);
    ws.addEventListener('message', ev => {
      if (typeof ev.data === 'string') {
        if (ev.data.includes('Path:turn.end')) { clearTimeout(timer); resolve(); }
      } else {
        const buf = new Uint8Array(ev.data);
        const headLen = (buf[0] << 8) | buf[1];
        const head = new TextDecoder().decode(buf.subarray(2, 2 + headLen));
        if (head.includes('Path:audio')) chunks.push(buf.subarray(2 + headLen));
      }
    });
    ws.addEventListener('close', () => { clearTimeout(timer); resolve(); });
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('upstream error')); });
  });
  ws.send(`X-Timestamp:${stamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
  ws.send(`X-RequestId:${rnd(16)}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp()}Z\r\nPath:ssml\r\n\r\n` +
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='${rate}' volume='+0%'>${esc(text)}</prosody></voice></speak>`);
  await done;
  try { ws.close(); } catch (e) {}
  const total = chunks.reduce((n, c) => n + c.length, 0);
  if (!total) throw new Error('no audio received');
  const out = new Uint8Array(total);
  let off = 0; for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('ok', { headers: CORS });
    if (url.pathname === '/reader.js') return new Response(CORE, { headers: Object.assign({ 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }, CORS) });
    if (url.pathname !== '/tts') return new Response('not found', { status: 404, headers: CORS });
    let p = Object.fromEntries(url.searchParams);
    if (request.method === 'POST') { try { p = Object.assign(p, await request.json()); } catch (e) {} }
    if (env && env.ACCESS_KEY && p.key !== env.ACCESS_KEY) return new Response('wrong key', { status: 403, headers: CORS });
    const text = String(p.text || '').slice(0, 2000);
    if (!text.trim()) return new Response('empty text', { status: 400, headers: CORS });
    const voice = /^[a-zA-Z]{2,3}-[a-zA-Z]{2,4}-[A-Za-z]+Neural$/.test(p.voice || '') ? p.voice : 'zh-TW-HsiaoChenNeural';
    const rate = /^[+-]\d{1,3}%$/.test(p.rate || '') ? p.rate : '+0%';
    try {
      const audio = await synth(text, voice, rate);
      return new Response(audio, { headers: Object.assign({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' }, CORS) });
    } catch (e) {
      return new Response('tts failed: ' + e.message, { status: 502, headers: CORS });
    }
  },
};
