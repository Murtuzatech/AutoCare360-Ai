import { buildReport, plainMoney } from './models'
import { formatDistance } from '../format'

/** Assembles a report model from the in-memory garage data. Shared by the Reports page and AI action cards. */
export function buildReportFromGarage({ type, vehicleId, garage, unit, currency, range = {}, includeService = true }) {
  const vehicle = garage.vehicles.find((v) => v.id === vehicleId) ?? null
  const only = (list) => (vehicle ? list.filter((x) => x.vehicle_id === vehicle.id) : list)
  return buildReport(type, {
    vehicle, vehicles: garage.vehicles,
    services: type === 'expense' ? garage.services : only(garage.services),
    tasks: only(garage.tasks), issues: only(garage.issues), expenses: garage.expenses,
    range, includeService, unit,
    fmt: { money: plainMoney(currency), dist: (km) => formatDistance(km, unit) },
  })
}
