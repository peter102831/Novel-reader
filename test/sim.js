const {JSDOM}=require('jsdom');const fs=require('fs');
const FAIL=process.argv[2]==='fail';
const page=(n,next)=>`<html><head><title>第${n}章</title></head><body><h1>第${n}章</h1><div class="wrap"><div id="content"><p>第${n}章 系統雖然遲누，但也綁錯人了啊</p><p>龍濤終於從雜役熬늅了늌門弟子。</p><p>${'很長的句子。'.repeat(80)}</p><p>幻聽？</p><p>不……</p><p>難道真是系統？</p><p>溫馨提示: 網站即將改版</p></div></div><div><a href="/b/dir">目錄</a>|<a href="${next}">下一章</a></div></body></html>`;
const pages={'https://x.com/b/1.html':page(1,'/b/2.html'),'https://x.com/b/2.html':page(2,'/b/dir')};
const dom=new JSDOM(pages['https://x.com/b/1.html'],{url:'https://x.com/b/1.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;const played=[],spoken=[],ttsReq=[];let n=0;const blobText={};
w.fetch=u=>{if(u.startsWith('https://novel-reader')){const t=new URL(u).searchParams.get('text');ttsReq.push(t);if(FAIL)return Promise.resolve({ok:false,status:502,headers:{get:()=>'text/plain'}});return Promise.resolve({ok:true,headers:{get:()=>'audio/mpeg'},blob:()=>Promise.resolve({t})})}
 return Promise.resolve({ok:true,text:()=>Promise.resolve(pages[u])})};
w.URL.createObjectURL=b=>{const k='blob:'+(++n);blobText[k]=b.t;return k};w.URL.revokeObjectURL=()=>{};
w.Audio=function(){const a={paused:true,_u:{},getAttribute(k){return this._u[k]||null},setAttribute(k,v){this._u[k]=v},load(){},play(){if(this.src&&blobText[this.src]!==undefined){played.push(blobText[this.src]);this.paused=false;setTimeout(()=>{this.paused=true;this.onended&&this.onended()},0)}return Promise.resolve()},pause(){this.paused=true},addEventListener(){}};return a};
w.SpeechSynthesisUtterance=function(t){this.text=t};
w.speechSynthesis={getVoices:()=>[],cancel(){},speak(u){spoken.push(u.text);setTimeout(()=>u.onend&&u.onend(),0)}};
w.Element.prototype.scrollIntoView=function(){};
let opened=0;w.open=()=>{opened++;return null};
w.eval(fs.readFileSync(require('path').join(__dirname,'..','reader.js'),'utf8'));
const fd=w.document.getElementById('nr-frame').contentDocument;
fd.defaultView.Element.prototype.scrollIntoView=function(){};
fd.querySelector('#nr-start button').click();
setTimeout(()=>{console.log('PLAYED',played.length,played.map(s=>s.slice(0,14)));console.log('SPOKEN',spoken.length,spoken.map(s=>s.slice(0,14)));console.log('TTS requests',ttsReq.length,'unique',new Set(ttsReq).size);console.log('TOP:',fd.getElementById('nr-top').textContent);console.log('URL:',w.location.href);fd.body.click();w.open('https://ad.example');console.log('POPUPS while open:',opened)},1500);
