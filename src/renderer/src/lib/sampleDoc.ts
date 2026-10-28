export const SAMPLE_MARKDOWN = `# Markdown 轉 PDF 示範文件

這份文件用來驗證 **表格** 與 **Mermaid 流程圖** 的預覽與 PDF 輸出品質。

## 專案重點

- 左側編輯 Markdown，右側即時預覽
- GitHub Flavored Markdown 表格
- Mermaid flowchart / sequence / class 圖會轉成向量圖再進 PDF

> 提示：按 \`Ctrl + E\` 可直接匯出 PDF。

## 功能對照表

| 功能 | 預覽 | PDF | 說明 |
| :--- | :---: | :---: | :--- |
| 標題與段落 | ✓ | ✓ | 支援 H1–H6、引用、清單 |
| **GFM 表格** | ✓ | ✓ | 對齊、框線、表頭底色 |
| **Mermaid 流程圖** | ✓ | ✓ | 先渲染成 SVG 再輸出 |
| 程式碼區塊 | ✓ | ✓ | 語法高亮 |
| 工作清單 | ✓ | ✓ | \`- [x]\` 核取方塊 |

欄位對齊示範：

| 項目 | 數量 | 單價 (TWD) | 狀態 |
| :--- | ---: | ---: | :---: |
| 紙張 | 120 | 8.5 | 正常 |
| 墨水 | 6 | 320 | 偏低 |
| 釘書針 | 40 | 15 | 正常 |

## 轉換流程

\`\`\`mermaid
flowchart TD
    A[開啟 .md 檔案] --> B[解析 Markdown]
    B --> C{內容類型}
    C -->|表格| D[GFM 表格渲染]
    C -->|Mermaid| E[轉成 SVG 圖]
    C -->|文字/程式碼| F[HTML 排版]
    D --> G[即時預覽]
    E --> G
    F --> G
    G --> H[匯出 A4 PDF]
\`\`\`

## 系統互動

\`\`\`mermaid
sequenceDiagram
    participant U as 使用者
    participant A as MD2Pdf
    participant M as Mermaid
    participant P as PDF 引擎

    U->>A: 開啟或編輯 Markdown
    A->>A: GFM 解析表格
    A->>M: 渲染 flowchart
    M-->>A: 回傳 SVG
    A-->>U: 右側即時預覽
    U->>A: 匯出 PDF
    A->>P: 帶入已渲染 HTML
    P-->>U: 產出 PDF 檔
\`\`\`

## 類別關係

\`\`\`mermaid
classDiagram
    class MarkdownParser {
      +parse(text) HTML
    }
    class MermaidRenderer {
      +render(code) SVG
    }
    class PdfExporter {
      +export(html) PDF
    }
    MarkdownParser --> MermaidRenderer
    MarkdownParser --> PdfExporter
\`\`\`

## 程式碼範例

\`\`\`ts
const html = marked.parse(markdown, { gfm: true })
await mermaid.render(id, mermaidSource)
\`\`\`

- [x] 表格轉換
- [x] Mermaid 流程圖
- [ ] 你的下一份文件
`
