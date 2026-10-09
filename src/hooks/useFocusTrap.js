import { useEffect } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps Tab / Shift+Tab inside `ref` while `active`, and restores focus to the previously focused element on close. */
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return
    const container = ref.current
    const previous = document.activeElement
    const visible = () => [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
    // Move focus into the container when it opens (e.g. from the button that opened it).
    if (!container.contains(document.activeElement)) container.focus()
    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const items = visible()
      if (!items.length) { e.preventDefault(); container.focus(); return }
      const first = items[0], last = items[items.length - 1]
      const outside = !container.contains(document.activeElement)
      if (outside) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus?.() }
  }, [ref, active])
}
