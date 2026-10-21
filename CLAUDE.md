# 網路小說朗讀書籤：給接手的 Claude 看的專案說明

## 使用者與目標
- 使用者弱視，主要在 **Android 手機的 Chrome** 上看網路小說（常用 timotxt.com 提莫書屋）。
- 需求：在章節頁點一個書籤 → 大字顯示正文並朗讀 → 讀完自動接下一章 → 鎖定螢幕也能繼續聽。
- 使用者的電腦不能裝 Firefox 或任何瀏覽器擴充功能，所以只能用書籤（bookmarklet）。
- 回覆使用者時用繁體中文，步驟要短、按鈕名稱要寫清楚；先在電腦上驗證通過，才請使用者用手機試。

## 架構
```
手機書籤（短）
  └─ 載入 https://novel-reader.a1028318.workers.dev/reader.js   （失敗時改用 raw.githack.com 上的 reader.core.js）
        └─ 朗讀程式在小說頁上執行：抓正文 → 呼叫 /tts 取得 mp3 → 播放 → 抓下一章
Cloudflare Worker（tts/worker.js，名稱 novel-reader）
  ├─ GET /reader.js  回傳打包進 Worker 的 reader.core.js（no-store，永遠最新）
  └─ GET /tts?text=&voice=&rate=  透過微軟 Edge 線上語音產生 mp3
```
- Cloudflare 已用 **Workers Builds 連接這個 GitHub 儲存庫**：push 到 `main` 後約 1～2 分鐘自動部署。Worker 名稱必須和 `wrangler.toml` 的 `name = "novel-reader"` 一致，否則部署失敗。
- 雲端語音連續失敗 3 次，朗讀程式會自動改用手機內建語音（speechSynthesis）。

## 檔案
- `reader.js`：朗讀程式原始碼。**改完一定要 `npm run build` 產生 `reader.core.js` 並一起 commit**，Worker 打包的是 `reader.core.js`。
- `reader.core.js`：壓縮後的純 ASCII 版本。
- `reader.min.js`：舊版書籤用的小載入檔（保留相容）。
- `tts/worker.js`：Cloudflare Worker。Sec-MS-GEC v2 驗證碼算法移植自 rany2/edge-tts 7.3.1 的 drm.py，已逐一比對輸出一致。
- `wrangler.toml`：Worker 設定，含把 `*.core.js` 當文字模組打包的規則。
- `installer/page.html`：安裝說明頁範本（`__BM__` 會換成書籤代碼，HTML escape 後放進 textarea），發佈在使用者的 claude.ai Artifact。
- `test/sim.js`：用 jsdom 模擬小說頁、雲端語音與手機語音的整合測試。`npm test` 會跑正常與雲端故障兩種情況。

## 目前的書籤代碼
```
javascript:(function(){function L(u,f){var s=document.createElement('script');s.src=u;s.onerror=f;document.body.appendChild(s)}L('https://novel-reader.a1028318.workers.dev/reader.js?t='+Date.now(),function(){L('https://raw.githack.com/peter102831/Novel-reader/main/reader.core.js?t='+Date.now())})})()
```

## 踩過的坑（不要重蹈覆轍）
- **Android Chrome 的書籤長度有限**：一萬字的書籤點了完全沒反應，`javascript:alert(1)` 則正常。所以書籤只負責載入外部程式。
- 書籤裡避免使用 `#`、`%` 和非 ASCII 字元。
- **Android Chrome 會忽略網頁指定的 speechSynthesis 聲音**，一律用系統預設；使用者手機系統只有一個中文聲音，手機版 Edge 也一樣，所以才改走雲端語音。
- 瀏覽器規定要使用者親手點擊後才能發聲，所以啟動後會先顯示黃色「點這裡開始朗讀」大按鈕。
- jsDelivr 的 `@main` 會快取約 12 小時，raw.githack.com 不同節點也會給舊版，所以改由自己的 Worker 提供程式。
- **提莫書屋的反爬機制**：大約 149 個常用字在 HTML 裡被換成韓文字（例如 누＝到、귷＝八），網站再用自訂字型 `bqg`（/fonts/f24092.woff2）把它們畫成中文。對照表 `FIXS` 是把字型裡每個字形和系統中文字型逐字比對、再用上下文和字形點陣人工確認得出的。如果網站換了字型檔，正文會出現怪字或漏字，就要重新做這個比對。
- 長段落切成最多 300 字，相鄰短段落合併成一次請求；兩個 Audio 輪流預載，並預先抓 4 段，段落間隔實測約 2～7 毫秒。
- **網站的彈窗廣告**：廣告程式監聽整個網頁的點擊，原本點朗讀畫面也會觸發彈窗。現在朗讀介面放在同源的 iframe（`#nr-frame`）裡，點擊不會傳到網頁；朗讀畫面開著時也會擋掉 `window.open`。實測：真實點擊開始按鈕後，網頁的 pointerdown/touchstart/mousedown 監聽器一次都沒收到。介面的 DOM 要用 `fdoc` 建立，不能用 `document`。
- 背景播放：另外循環播放一段幾乎無聲的音檔，讓頁面不被系統暫停；並設定 Media Session，鎖定畫面可以控制播放。

## 風險與備案
- Edge 線上語音是**非官方用法**，微軟可能改驗證方式。失效時先看 rany2/edge-tts 最新版的 `constants.py` 和 `drm.py`（`SEC_MS_GEC_VERSION`、token 算法），同步更新 `tts/worker.js`。
- 正式備案是 Azure AI Speech（每月 50 萬字免費，有 zh-TW 神經網路語音，但需要綁信用卡），只要改 Worker 的 `/tts`，朗讀程式不用動。

## 驗證方式
- 本機：`npm test`。
- 線上：用使用者電腦上 Claude App 的內建瀏覽器打開小說頁，執行書籤代碼，點開始按鈕，檢查 `/tts` 請求都是 200、`speechSynthesis.speaking` 為 false（代表用的是雲端語音），再點最後一段，確認會自動接到下一章。
