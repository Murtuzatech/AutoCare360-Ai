import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'

const MAX = 4000

export function Composer({ onSend, onStop, sending, disabled, restoreText }) {
  const [text, setText] = useState('')
  const ref = useRef(null)

  useEffect(() => { if (restoreText) setText(restoreText) }, [restoreText])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const submit = () => {
    const value = text.trim()
    if (!value || sending || disabled) return
    onSend(value)
    setText('')
  }

  return (
    <div>
      <div className="flex items-end gap-2 rounded-card border border-line bg-surface p-2 focus-within:border-brand">
        <label htmlFor="chat-input" className="sr-only">Message the assistant</label>
        <textarea id="chat-input" ref={ref} rows={1} value={text} maxLength={MAX} disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
          placeholder="Ask about your vehicle, a warning light, or maintenance…"
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted/70 focus-visible:ring-0 focus-visible:ring-offset-0" />
        {sending ? (
          <button onClick={onStop} aria-label="Stop response" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-surface-2 text-ink hover:bg-line"><Square className="h-4 w-4 fill-current" /></button>
        ) : (
          <button onClick={submit} disabled={!text.trim() || disabled} aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-brand text-brand-ink disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
        )}
      </div>
      {text.length > MAX - 300 && <p className="mt-1 text-right text-xs text-muted">{text.length} / {MAX}</p>}
    </div>
  )
}
