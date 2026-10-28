# MD2Pdf

把 Markdown 轉成 PDF 的桌面工具：左側編輯、右側即時預覽，並特別處理 **GFM 表格** 與 **Mermaid 流程圖**。

## 功能

- 開啟、編輯、儲存 `.md` 檔案（也支援拖放）
- 即時預覽標題、清單、程式碼、核取方塊
- GitHub Flavored Markdown 表格（對齊、表頭、斑馬紋）
- \`\`\`mermaid 區塊會先轉成 SVG，再寫進 PDF（flowchart / sequence / class）
- 以 Chromium `printToPDF` 輸出 A4，表格與流程圖盡量不分頁切開
- 匯出 Word（`.docx`）：表格保留框線與表頭，Mermaid 圖會轉成圖片嵌入

## 開發

需要 Node.js 18+。

```bash
npm install
npm run dev
```

## 打包 Windows 應用程式

```bash
npm run dist
```

完成後檔案在 `release/`：

- `MD2Pdf-Setup-1.0.0.exe`：安裝程式（可選路徑，並建立桌面捷徑）
- `MD2Pdf-Portable-1.0.0.exe`：免安裝，雙擊即可執行
- `win-unpacked/MD2Pdf.exe`：未壓縮的執行檔目錄

## 快捷鍵

| 動作 | 按鍵 |
| :--- | :--- |
| 開啟 | Ctrl + O |
| 儲存 | Ctrl + S |
| 匯出 PDF | Ctrl + E |
| 匯出 Word | Ctrl + Shift + E |
