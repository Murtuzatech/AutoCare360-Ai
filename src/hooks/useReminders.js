import { useMemo } from 'react'
import { useGarage } from '@/contexts/GarageContext'
import { useAuth } from '@/contexts/AuthContext'
import { deriveReminders } from '@/lib/reminders'

export function useReminders() {
  const { vehicles, services, tasks, reminders } = useGarage()
  const { profile } = useAuth()
  const unit = profile.preferences.units.distance
  const all = useMemo(
    () => deriveReminders({ vehicles, services, tasks, reminders }, profile.preferences, unit),
    [vehicles, services, tasks, reminders, profile.preferences, unit],
  )
  const attentionCount = all.filter((r) => r.severity !== 'upcoming').length
  return { reminders: all, attentionCount }
}
