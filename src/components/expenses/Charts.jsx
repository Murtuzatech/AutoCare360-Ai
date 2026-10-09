import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTheme } from '@/contexts/ThemeContext'
import { EXPENSE_CATEGORIES, labelOf } from '@/lib/constants'
import { formatMonth } from '@/lib/format'

const THEMES = {
  light: { brand: '#0f6e7a', muted: '#5f6b78', line: '#d8dfe6', surface: '#ffffff', ink: '#141a21' },
  dark: { brand: '#3ebeca', muted: '#8e9ba8', line: '#2a343e', surface: '#141a20', ink: '#e8edf2' },
}
const useColors = () => { const { resolved } = useTheme(); return useMemo(() => THEMES[resolved], [resolved]) }

const compact = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const shortMonth = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })

function tooltipProps(c) {
  return { contentStyle: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10, color: c.ink, fontSize: 13 }, labelStyle: { color: c.muted }, itemStyle: { color: c.ink } }
}

export function MonthlyChart({ data, money }) {
  const c = useColors()
  return (
    <>
    <div className="sr-only"><table>
      <caption>Monthly spending</caption>
      <thead><tr><th>Month</th><th>Spent</th><th>3-month average</th></tr></thead>
      <tbody>{data.slice(-24).map((r) => <tr key={r.key}><td>{formatMonth(`${r.key}-01`)}</td><td>{money(r.total)}</td><td>{money(r.average)}</td></tr>)}</tbody>
    </table></div>
    <div className="h-64 w-full" aria-hidden="true">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.line} />
          <XAxis dataKey="key" tickFormatter={shortMonth} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={compact} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
          <Tooltip {...tooltipProps(c)} cursor={{ fill: c.line, opacity: 0.35 }} labelFormatter={(k) => formatMonth(`${k}-01`)}
            formatter={(v, name) => [money(v), name === 'average' ? '3-month average' : 'Spent']} />
          <Bar dataKey="total" fill={c.brand} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line dataKey="average" type="monotone" stroke={c.ink} strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </>
  )
}

export function CategoryChart({ data, money }) {
  const c = useColors()
  const sum = data.reduce((s, d) => s + d.amount, 0)
  const color = (cat) => EXPENSE_CATEGORIES.find((x) => x.value === cat)?.color ?? '#999'
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0" aria-hidden="true">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={80} paddingAngle={2} stroke={c.surface} strokeWidth={2}>
              {data.map((d) => <Cell key={d.category} fill={color(d.category)} />)}
            </Pie>
            <Tooltip {...tooltipProps(c)} formatter={(v, _n, p) => [money(v), labelOf(EXPENSE_CATEGORIES, p.payload.category)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: color(d.category) }} aria-hidden />
            <span className="flex-1 truncate">{labelOf(EXPENSE_CATEGORIES, d.category)}</span>
            <span className="text-muted">{Math.round((d.amount / sum) * 100)}%</span>
            <span className="w-24 text-right font-medium">{money(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function VehicleChart({ data, money }) {
  const c = useColors()
  return (
    <>
    <div className="sr-only"><table>
      <caption>Spending by vehicle</caption>
      <thead><tr><th>Vehicle</th><th>Spent</th></tr></thead>
      <tbody>{data.map((r) => <tr key={r.id}><td>{r.name}</td><td>{money(r.amount)}</td></tr>)}</tbody>
    </table></div>
    <div style={{ height: Math.max(120, data.length * 48 + 24) }} className="w-full" aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" tickFormatter={compact} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fill: c.ink, fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipProps(c)} cursor={{ fill: c.line, opacity: 0.35 }} formatter={(v) => [money(v), 'Spent']} />
          <Bar dataKey="amount" fill={c.brand} radius={[0, 4, 4, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    </>
  )
}
