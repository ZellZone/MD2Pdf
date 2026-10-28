type EditorPaneProps = {
  value: string
  onChange: (value: string) => void
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  return (
    <section className="pane">
      <div className="pane-label">
        <span>Markdown 來源</span>
      </div>
      <textarea
        className="editor"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            const target = event.currentTarget
            const start = target.selectionStart
            const end = target.selectionEnd
            const next = `${value.slice(0, start)}  ${value.slice(end)}`
            onChange(next)
            requestAnimationFrame(() => {
              target.selectionStart = start + 2
              target.selectionEnd = start + 2
            })
          }
        }}
      />
    </section>
  )
}
