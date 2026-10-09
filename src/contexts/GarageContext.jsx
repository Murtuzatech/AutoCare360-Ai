import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAll } from '@/lib/db'
import { useAuth } from './AuthContext'
import * as api from '@/services/garage'
import { friendly } from '@/services/garage'

const GarageContext = createContext(null)

const SOURCES = {
  vehicles: { table: 'vehicles', col: 'created_at', asc: true },
  services: { table: 'service_records', col: 'service_date', asc: false },
  tasks: { table: 'maintenance_tasks', col: 'created_at', asc: false },
  issues: { table: 'vehicle_issues', col: 'created_at', asc: false },
  reminders: { table: 'reminders', col: 'due_date', asc: true },
  expenses: { table: 'expenses', col: 'expense_date', asc: false },
  documents: { table: 'vehicle_documents', col: 'created_at', asc: false },
  analyses: { table: 'analyses', col: 'created_at', asc: false },
}
const ALL = Object.keys(SOURCES)
const EMPTY = { vehicles: [], services: [], tasks: [], issues: [], reminders: [], expenses: [], documents: [], analyses: [] }

/**
 * Holds all of the signed-in user's garage data in one place. Datasets are small per user,
 * so pages filter and derive locally (health, reminders, timeline) instead of refetching.
 * RLS guarantees the queries only ever return this user's rows.
 */
export function GarageProvider({ children }) {
  const { user } = useAuth()
  const userId = user.id
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async (keys = ALL) => {
    const results = await Promise.all(keys.map((k) => fetchAll(SOURCES[k].table, { column: SOURCES[k].col, ascending: SOURCES[k].asc })))
    const failed = results.find((r) => r.error)
    if (failed) { setError(friendly(failed.error)); return false }
    setData((prev) => {
      const next = { ...prev }
      keys.forEach((k, i) => { next[k] = results[i].data })
      return next
    })
    setError(null)
    return true
  }, [])

  const initial = useCallback(async () => { setLoading(true); await reload(); setLoading(false) }, [reload])
  useEffect(() => { initial() }, [initial])

  const actions = useMemo(() => {
    const after = (keys) => async (result) => { await reload(keys); return result }
    return {
      saveVehicle: (args) => api.saveVehicle(userId, args).then(after(['vehicles'])),
      appendVehicleNote: (vehicle, note) => api.appendVehicleNote(vehicle, note).then(after(['vehicles'])),
      updateOdometer: (id, km) => api.updateOdometer(id, km).then(after(['vehicles'])),
      deleteVehicle: (vehicle) => api.deleteVehicle(vehicle, data).then(after(ALL)),
      saveService: async (args, vehicle) => {
        const saved = await api.saveService(userId, args)
        // Keep the vehicle's odometer in step with its newest reading
        if (vehicle && saved.odometer_km > vehicle.odometer_km) await api.updateOdometer(vehicle.id, saved.odometer_km)
        await reload(['services', 'vehicles'])
        return saved
      },
      deleteService: (record) => api.deleteService(record).then(after(['services'])),
      saveTask: (args) => api.saveTask(userId, args).then(after(['tasks'])),
      setTaskStatus: (task, status) => api.setTaskStatus(task, status).then(after(['tasks'])),
      deleteTask: (id) => api.deleteRow('maintenance_tasks', id).then(after(['tasks'])),
      saveIssue: (args) => api.saveIssue(userId, args).then(after(['issues'])),
      setIssueStatus: (issue, status) => api.setIssueStatus(issue, status).then(after(['issues'])),
      deleteIssue: (id) => api.deleteRow('vehicle_issues', id).then(after(['issues'])),
      saveReminder: (args) => api.saveReminder(userId, args).then(after(['reminders'])),
      setReminderStatus: (id, status) => api.setReminderStatus(id, status).then(after(['reminders'])),
      saveExpense: (args) => api.saveExpense(userId, args).then(after(['expenses'])),
      deleteExpense: (expense) => api.deleteExpense(expense).then(after(['expenses'])),
      uploadDocument: (args) => api.uploadDocument(userId, args).then(after(['documents'])),
      updateDocument: (id, values) => api.updateDocument(id, values).then(after(['documents'])),
      deleteDocument: (doc) => api.deleteDocument(doc).then(after(['documents'])),
      createAnalysis: (args) => api.createAnalysis(userId, args).then(after(['analyses'])),
      deleteAnalysis: (a) => api.deleteAnalysis(a).then(after(['analyses'])),
      deleteReminder: (id) => api.deleteRow('reminders', id).then(after(['reminders'])),
    }
  }, [userId, data, reload])

  // `reload` is a full reload with a loading state (retry button); `refresh(keys)` quietly re-fetches some datasets.
  const value = useMemo(() => ({ ...data, loading, error, reload: initial, refresh: reload, actions }), [data, loading, error, initial, reload, actions])
  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
}

export const useGarage = () => useContext(GarageContext)
