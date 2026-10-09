import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t.slice(-2), { id, message, type }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="flex w-full max-w-sm animate-[pop-in_.2s_ease-out] items-start gap-3 rounded-ctl border border-line bg-surface px-4 py-3 shadow-pop">
            {t.type === 'success'
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
              : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
