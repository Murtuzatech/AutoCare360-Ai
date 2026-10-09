import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'autocare-theme'
const readStored = () => {
  try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStored)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const setTheme = useCallback((value) => {
    setPreference(value)
    try { localStorage.setItem(KEY, value) } catch { /* storage unavailable */ }
  }, [])

  const value = useMemo(() => ({ preference, resolved, setTheme }), [preference, resolved, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
