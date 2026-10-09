import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const base = 'inline-flex items-center justify-center gap-2 rounded-ctl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'
const variants = {
  primary: 'bg-brand text-brand-ink hover:bg-brand/90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-danger-ink hover:bg-danger/90',
}
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-base' }

/** Use for <Link> elements that should look like buttons. */
export const buttonStyles = ({ variant = 'primary', size = 'md', className } = {}) =>
  cn(base, variants[variant], sizes[size], className)

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonStyles({ variant, size, className })} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
