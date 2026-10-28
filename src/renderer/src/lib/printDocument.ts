import previewCss from '../styles/preview.css?raw'

const PRINT_EXTRA = `
@page {
  size: A4;
  margin: 18mm 16mm 20mm 16mm;
}
html, body {
  background: #fff !important;
  margin: 0;
  padding: 0;
}
.document-sheet {
  box-shadow: none !important;
  margin: 0 !important;
  max-width: none !important;
  padding: 0 !important;
  border: none !important;
}
`

export function buildPrintDocument(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${escapeAttr(title)}</title>
  <style>${previewCss}\n${PRINT_EXTRA}</style>
</head>
<body>
  <article class="markdown-body document-sheet print-root">${bodyHtml}</article>
</body>
</html>`
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
