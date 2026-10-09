import { useAuth } from '@/contexts/AuthContext'
import { formatDistance, formatMoney } from '@/lib/format'

export function useFormat() {
  const { profile } = useAuth()
  const { distance: unit, currency } = profile.preferences.units
  return { unit, currency, money: (n) => formatMoney(n, currency), dist: (km) => formatDistance(km, unit) }
}
