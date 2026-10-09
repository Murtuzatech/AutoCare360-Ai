import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Logo } from '../Logo'
import { mainNav, accountNav } from './nav'

function Item({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to} onClick={onNavigate}
      className={({ isActive }) => cn(
        'flex h-10 items-center gap-3 rounded-ctl px-3 text-sm font-medium transition-colors',
        isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center px-5"><Logo /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
        {mainNav.map((i) => <Item key={i.to} {...i} onNavigate={onNavigate} />)}
      </nav>
      <nav className="space-y-1 border-t border-line px-3 py-3" aria-label="Account">
        {accountNav.map((i) => <Item key={i.to} {...i} onNavigate={onNavigate} />)}
      </nav>
    </div>
  )
}
