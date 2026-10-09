import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Monitor, Moon, Settings, Sun, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar } from '../ui/Controls'
import { Logo } from '../Logo'
import { useReminders } from '@/hooks/useReminders'

const themeCycle = { light: 'dark', dark: 'system', system: 'light' }
const themeIcon = { light: Sun, dark: Moon, system: Monitor }

export function Topbar({ onMenu }) {
  const { profile, user, avatarUrl, signOut } = useAuth()
  const { preference, setTheme } = useTheme()
  const navigate = useNavigate()
  const { attentionCount } = useReminders()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const ThemeIcon = themeIcon[preference]
  const displayName = profile?.full_name || user?.email || 'Account'

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const iconBtn = 'flex h-10 w-10 items-center justify-center rounded-ctl text-muted hover:bg-surface-2 hover:text-ink'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-8">
      <button onClick={onMenu} className={`${iconBtn} lg:hidden`} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <Logo className="lg:hidden" />
      <div className="flex-1" />
      <button onClick={() => setTheme(themeCycle[preference])} className={iconBtn} aria-label={`Theme: ${preference}. Switch theme`} title={`Theme: ${preference}`}>
        <ThemeIcon className="h-[18px] w-[18px]" />
      </button>
      <Link to="/notifications" className={`${iconBtn} relative`} aria-label={attentionCount ? `Notifications, ${attentionCount} need attention` : 'Notifications'}>
        <Bell className="h-[18px] w-[18px]" />
        {attentionCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-ink">{attentionCount > 9 ? '9+' : attentionCount}</span>}
      </Link>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="ml-1 rounded-full">
          <Avatar src={avatarUrl} name={displayName} size={36} />
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-60 animate-[pop-in_.15s_ease-out] overflow-hidden rounded-card border border-line bg-surface shadow-pop">
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
            <div className="p-1.5">
              {[{ to: '/profile', label: 'Profile', icon: User }, { to: '/settings', label: 'Settings', icon: Settings }].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm hover:bg-surface-2">
                  <Icon className="h-4 w-4 text-muted" />{label}
                </Link>
              ))}
              <button role="menuitem" onClick={async () => { await signOut(); navigate('/login') }} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm hover:bg-surface-2">
                <LogOut className="h-4 w-4 text-muted" />Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
