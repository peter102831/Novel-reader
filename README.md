# 網路小說朗讀書籤

在手機或電腦的瀏覽器上，打開網路小說的章節頁，點一下書籤就會用大字顯示正文並朗讀，讀完自動接續下一章。

- 自動抓取正文、略過廣告句
- 修正提莫書屋把中文字藏成韓文字的問題
- 大按鈕介面：暫停、跳段落、調語速、調字體
- 在 Android 上嘗試讓鎖定畫面後繼續朗讀

## 書籤代碼

```
javascript:(function(){function L(u,f){var s=document.createElement('script');s.src=u;s.onerror=f;document.body.appendChild(s)}L('https://novel-reader.a1028318.workers.dev/reader.js?t='+Date.now(),function(){L('https://raw.githack.com/peter102831/Novel-reader/main/reader.core.js?t='+Date.now())})})()
```

- `reader.js`：原始碼
- `reader.core.js`：壓縮後的朗讀程式
- `reader.min.js`：書籤載入的小檔案，每次都去抓最新的 `reader.core.js`，所以更新程式後不必改書籤

## 雲端語音服務（tts/worker.js）

部署在 Cloudflare Workers 上的小服務，透過微軟 Edge 的線上語音產生自然的台灣口音語音（例如 `zh-TW-HsiaoChenNeural`），回傳 mp3。
驗證碼算法移植自開源專案 [rany2/edge-tts](https://github.com/rany2/edge-tts)。這屬於非官方用法，微軟可能隨時更改。

- `GET /reader.js` → 最新版朗讀程式（書籤從這裡載入，GitHub 更新後 Cloudflare 會自動重新部署）
- `GET /tts?text=要唸的字&voice=zh-TW-HsiaoChenNeural&rate=+0%` → mp3
- 可在 Cloudflare 設定 `ACCESS_KEY` 密碼，之後請求需帶 `key=` 參數
