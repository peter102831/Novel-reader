# 網路小說朗讀書籤

在手機或電腦的瀏覽器上，打開網路小說的章節頁，點一下書籤就會用大字顯示正文並朗讀，讀完自動接續下一章。

- 自動抓取正文、略過廣告句
- 修正提莫書屋把中文字藏成韓文字的問題
- 大按鈕介面：暫停、跳段落、調語速、調字體
- 在 Android 上嘗試讓鎖定畫面後繼續朗讀

## 書籤代碼

```
javascript:(function(){function L(u,f){var s=document.createElement('script');s.src=u;s.onerror=f;document.body.appendChild(s)}L('https://raw.githack.com/peter102831/Novel-reader/main/reader.core.js?t='+Date.now(),function(){L('https://cdn.jsdelivr.net/gh/peter102831/Novel-reader@main/reader.core.js')})})()
```

- `reader.js`：原始碼
- `reader.core.js`：壓縮後的朗讀程式
- `reader.min.js`：書籤載入的小檔案，每次都去抓最新的 `reader.core.js`，所以更新程式後不必改書籤
