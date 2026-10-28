import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import mermaid from 'mermaid'

let mermaidReady = false
let renderSeq = 0

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function initMermaid(): void {
  if (mermaidReady) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: '"Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
      curve: 'basis',
      padding: 12
    },
    sequence: { useMaxWidth: true, actorMargin: 48 },
    class: { useMaxWidth: true },
    themeVariables: {
      background: '#fffdf8',
      primaryColor: '#e4efe6',
      primaryTextColor: '#1c2b22',
      primaryBorderColor: '#3d6b4f',
      lineColor: '#3d6b4f',
      secondaryColor: '#f3ead8',
      tertiaryColor: '#fffdf8',
      noteBkgColor: '#f7f0e2',
      noteTextColor: '#1c2b22',
      actorBkg: '#e4efe6',
      actorBorder: '#3d6b4f',
      actorTextColor: '#1c2b22',
      signalColor: '#1c2b22',
      fontFamily: '"Segoe UI", "Microsoft JhengHei", sans-serif'
    }
  })
  mermaidReady = true
}

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') return code
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = (lang || '').trim()
      if (language === 'mermaid') {
        return `<pre class="mermaid-source">${escapeHtml(text)}</pre>`
      }
      const className = language ? `hljs language-${language}` : 'hljs'
      return `<pre><code class="${className}">${text}</code></pre>`
    }
  }
})

export function parseMarkdown(source: string): string {
  return marked.parse(source, { async: false }) as string
}

export async function renderMermaidIn(container: HTMLElement): Promise<void> {
  initMermaid()
  const blocks = [...container.querySelectorAll<HTMLElement>('.mermaid-source')]
  const batch = ++renderSeq

  for (const [index, el] of blocks.entries()) {
    if (batch !== renderSeq) return
    const code = el.textContent ?? ''
    const id = `mmd-${batch}-${index}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const { svg } = await mermaid.render(id, code)
      if (batch !== renderSeq) return
      const wrap = document.createElement('figure')
      wrap.className = 'mermaid-svg'
      wrap.setAttribute('role', 'img')
      wrap.innerHTML = svg
      el.replaceWith(wrap)
    } catch (error) {
      if (batch !== renderSeq) return
      const message = error instanceof Error ? error.message : String(error)
      el.classList.add('mermaid-error')
      el.textContent = `Mermaid 無法渲染：${message}`
    }
  }
}

export function countMermaidBlocks(source: string): number {
  return [...source.matchAll(/```mermaid\b/g)].length
}
