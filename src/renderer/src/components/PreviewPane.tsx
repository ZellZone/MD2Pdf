import { useEffect, useRef, useState } from 'react'
import { parseMarkdown, renderMermaidIn } from '../lib/markdown'
import { getApi } from '../lib/platform'

type PreviewPaneProps = {
  markdown: string
  mermaidCount: number
  filePath: string | null
  onReadyChange: (ready: boolean) => void
}

async function resolveImages(container: HTMLElement, filePath: string | null): Promise<void> {
  if (!filePath) return
  const images = [...container.querySelectorAll('img')]
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src')
      if (!src || /^(https?:|data:|file:)/i.test(src)) return
      const dataUrl = await getApi().readRelative(filePath, src)
      if (dataUrl) img.setAttribute('src', dataUrl)
    })
  )
}

export function PreviewPane({
  markdown,
  mermaidCount,
  filePath,
  onReadyChange
}: PreviewPaneProps) {
  const bodyRef = useRef<HTMLElement>(null)
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onReadyChange(false)
    const timer = window.setTimeout(() => {
      try {
        setHtml(parseMarkdown(markdown))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        onReadyChange(true)
      }
    }, 180)

    return () => window.clearTimeout(timer)
  }, [markdown, onReadyChange])

  useEffect(() => {
    let cancelled = false
    const node = bodyRef.current
    if (!node || !html) {
      onReadyChange(true)
      return
    }

    void (async () => {
      try {
        await resolveImages(node, filePath)
        if (cancelled) return
        await renderMermaidIn(node)
        if (!cancelled) onReadyChange(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          onReadyChange(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [html, filePath, onReadyChange])

  return (
    <section className="pane">
      <div className="pane-label">
        <span>即時預覽</span>
        <span>{mermaidCount > 0 ? `${mermaidCount} 張 Mermaid` : 'GFM 表格已啟用'}</span>
      </div>
      <div className="preview-scroll">
        {error ? (
          <p className="mermaid-error" style={{ margin: 24 }}>
            {error}
          </p>
        ) : null}
        <article
          ref={bodyRef}
          className="markdown-body document-sheet preview-frame"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  )
}

