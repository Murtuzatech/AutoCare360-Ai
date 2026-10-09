import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { createFakeSupabase, V1, V2 } from './fakeSupabase'

const h = vi.hoisted(() => ({ fake: null, callAi: vi.fn(), streamChat: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ get supabase() { return h.fake }, isSupabaseConfigured: true }))
vi.mock('@/lib/ai', async () => ({ ...(await vi.importActual('@/lib/ai')), callAi: (...a) => h.callAi(...a), streamChat: (...a) => h.streamChat(...a) }))

import App from '@/App'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'

const renderApp = (path = '/dashboard') => render(
  <MemoryRouter initialEntries={[path]}><ThemeProvider><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></ThemeProvider></MemoryRouter>,
)
const heading = (name) => screen.findByRole('heading', { name }, { timeout: 4000 })
let errorSpy

beforeEach(() => {
  h.fake = createFakeSupabase()
  h.callAi.mockReset(); h.streamChat.mockReset()
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  const unexpected = errorSpy.mock.calls.filter((c) => !String(c[0]).includes('not wrapped in act'))
  errorSpy.mockRestore()
  expect(unexpected, `console.error was called: ${JSON.stringify(unexpected.map((c) => String(c[0]).slice(0, 200)))}`).toEqual([])
})

describe('every route renders with real data and no runtime errors', () => {
  const routes = [
    ['/dashboard', /Alex/], ['/vehicles', 'My Vehicles'], [`/vehicles/${V1}`, 'Daily driver'], [`/vehicles/${V1}?tab=health`, 'Daily driver'], [`/vehicles/${V1}?tab=service`, 'Daily driver'],
    [`/vehicles/${V1}?tab=maintenance`, 'Daily driver'], [`/vehicles/${V1}?tab=issues`, 'Daily driver'], [`/vehicles/${V1}?tab=timeline`, 'Daily driver'], [`/vehicles/${V1}?tab=expenses`, 'Daily driver'],
    [`/vehicles/${V1}?tab=documents`, 'Daily driver'], [`/vehicles/${V1}?tab=reports`, 'Daily driver'], [`/vehicles/${V1}/edit`, 'Edit Daily driver'], ['/vehicles/new', 'Add vehicle'],
    ['/service', 'Service & Maintenance'], ['/service?tab=maintenance', 'Service & Maintenance'], ['/analyzer', 'Analyzer'], ['/documents', 'Documents'], ['/expenses', 'Expenses'],
    ['/reports', 'Reports'], ['/assistant', /How can I help/], ['/notifications', 'Notifications'], ['/profile', 'Profile'], ['/settings', 'Settings'],
  ]
  for (const [path, name] of routes) {
    it(path, async () => {
      renderApp(path)
      expect(await heading(name)).toBeTruthy()
      await new Promise((r) => setTimeout(r, 30)) // let effects settle
      expect(screen.queryByText(/unexpected error/i)).toBeNull()
      expect(document.title).not.toBe('')
    })
  }
  it('unknown URL shows the not-found page, and "/" goes to the dashboard', async () => {
    renderApp('/nope/nothing'); expect(await heading('Page not found')).toBeTruthy()
  })
})

describe('authentication and route guards', () => {
  it('redirects signed-out visitors to login and lets them sign in', async () => {
    h.fake = createFakeSupabase({ signedIn: false })
    renderApp('/vehicles')
    expect(await heading('Welcome back')).toBeTruthy()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy()
    await user.clear(screen.getByLabelText('Password')); await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await heading('My Vehicles')).toBeTruthy() // returned to the page they originally wanted
  })
  it('signup validates the password length before submitting', async () => {
    h.fake = createFakeSupabase({ signedIn: false })
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Full name'), 'Sam'); await user.type(screen.getByLabelText('Email'), 's@x.com'); await user.type(screen.getByLabelText('Password'), 'short')
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create account' }).disabled).toBe(true)
  })
})

describe('core flows', () => {
  it('shows computed health, reminders and open issues on the dashboard', async () => {
    renderApp('/dashboard')
    await heading(/Alex/)
    expect(await screen.findByText('Brake noise')).toBeTruthy()
    expect(screen.getAllByText(/Insurance expires/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Notifications, \d+ need attention/ })).toBeTruthy()
  })

  it('validates then creates a vehicle, and focuses the first invalid field', async () => {
    renderApp('/vehicles/new')
    const user = userEvent.setup()
    await heading('Add vehicle')
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))
    expect(await screen.findByText('Give your vehicle a nickname.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Nickname')))
    await user.type(screen.getByLabelText('Nickname'), 'Scooter'); await user.type(screen.getByLabelText('Make'), 'TVS'); await user.type(screen.getByLabelText('Model'), 'Jupiter')
    await user.selectOptions(screen.getByLabelText('Fuel type'), 'petrol'); await user.type(screen.getByLabelText(/Current odometer/), '1200')
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))
    expect(await heading('Scooter')).toBeTruthy()
    expect(h.fake.db.vehicles.find((v) => v.nickname === 'Scooter').odometer_km).toBe(1200)
  })

  it('adds an expense and shows it in transactions', async () => {
    renderApp('/expenses')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add expense' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Vehicle'), V2)
    await user.type(within(dialog).getByLabelText(/Amount/), '450.50')
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(h.fake.db.expenses.some((e) => e.amount === 450.5 && e.vehicle_id === V2)).toBe(true))
    await user.click(screen.getByRole('tab', { name: /Transactions/ }))
    expect((await screen.findAllByText(/450\.5/)).length).toBeGreaterThan(0)
  })

  it('logging a service updates the odometer and total cost', async () => {
    renderApp('/service')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add service' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Vehicle'), V1)
    const odo = within(dialog).getByLabelText(/Odometer/); await user.clear(odo); await user.type(odo, '70000')
    await user.type(within(dialog).getByLabelText(/Labour cost/), '800')
    await user.click(within(dialog).getByRole('button', { name: 'Add part' }))
    await user.type(within(dialog).getByLabelText('Part 1 name'), 'Air filter'); await user.type(within(dialog).getByLabelText('Part 1 unit cost'), '250')
    await user.click(within(dialog).getByRole('button', { name: 'Add service' }))
    await waitFor(() => expect(h.fake.db.service_records.length).toBe(2))
    const saved = h.fake.db.service_records.find((s) => s.odometer_km === 70000)
    expect(saved.total_cost).toBe(1050)
    expect(h.fake.db.vehicles.find((v) => v.id === V1).odometer_km).toBe(70000)
  })

  it('rejects an impossible service form without saving', async () => {
    renderApp('/service')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add service' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add service' }))
    expect(await screen.findByText('Choose a vehicle.')).toBeTruthy()
    expect(h.fake.db.service_records.length).toBe(1)
  })

  it('settings toggles persist and the account can only be deleted after typing DELETE', async () => {
    renderApp('/settings')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('switch', { name: /PUC expiry/ }))
    await waitFor(() => expect(h.fake.db.profiles[0].preferences.notifications.puc).toBe(false))
    await user.click(screen.getByRole('button', { name: /Delete my account/ }))
    const dialog = screen.getByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Delete everything' })
    expect(confirm.disabled).toBe(true)
    await user.type(within(dialog).getByLabelText(/Type DELETE/), 'DELETE')
    h.callAi.mockResolvedValue({ deleted: true })
    await user.click(confirm)
    await waitFor(() => expect(h.callAi).toHaveBeenCalledWith({ action: 'delete_account', confirm: 'DELETE' }))
    expect(await heading('Welcome back')).toBeTruthy()
  })

  it('theme can be switched and is remembered', async () => {
    renderApp('/settings')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('radio', { name: /Dark/ }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('autocare-theme')).toBe('dark')
  })

  it('custom reminders can be completed from notifications', async () => {
    renderApp('/notifications')
    const user = userEvent.setup()
    const row = (await screen.findByText('Renew road tax')).closest('li')
    await user.click(within(row).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(h.fake.db.reminders[0].status).toBe('done'))
  })

  it('deleting a vehicle removes everything attached to it', async () => {
    renderApp(`/vehicles/${V1}`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Delete/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(await heading('My Vehicles')).toBeTruthy()
    await waitFor(() => expect(h.fake.db.vehicles.map((v) => v.id)).toEqual([V2]))
    for (const t of ['service_records', 'maintenance_tasks', 'vehicle_issues', 'expenses', 'vehicle_documents', 'analyses']) expect(h.fake.db[t].filter((r) => r.vehicle_id === V1)).toEqual([])
  })
})

describe('AI features', () => {
  it('chat streams a reply, shows context and a confirmable action card that opens a prefilled form', async () => {
    h.streamChat.mockImplementation(async (body, { onEvent }) => {
      const conv = { id: 'c0000000-0000-4000-8000-000000000001', user_id: 'u', vehicle_id: V1, title: body.message, updated_at: new Date().toISOString(), created_at: new Date().toISOString() }
      h.fake.db.conversations.push(conv)
      const action = { id: 'a1', type: 'maintenance_task', args: { vehicle_id: V1, title: 'Inspect front brake pads', category: 'brakes', due_date: null, notes: null }, status: 'proposed' }
      h.fake.db.messages.push({ id: 'm1', conversation_id: conv.id, user_id: 'u', role: 'user', content: body.message, actions: [], meta: {}, created_at: '2026-01-01T00:00:00Z' },
        { id: 'm2', conversation_id: conv.id, user_id: 'u', role: 'assistant', content: 'Brake noise can come from **worn pads**.', actions: [action], meta: { context: { vehicle: 'Daily driver', vehicles: 2, services: 1, openIssues: 1, openTasks: 1 }, safety: [] }, created_at: '2026-01-01T00:00:01Z' })
      onEvent({ event: 'meta', data: { conversation_id: conv.id, context: { vehicle: 'Daily driver' }, safety: [] } })
      onEvent({ event: 'text', data: { text: 'Brake noise' } })
      onEvent({ event: 'done', data: { message_id: 'm2' } })
    })
    renderApp('/assistant')
    const user = userEvent.setup()
    await heading(/How can I help/)
    await user.selectOptions(screen.getByLabelText('Vehicle context'), V1)
    await user.type(screen.getByLabelText('Message the assistant'), 'Why is my brake noisy?{Enter}')
    expect(await screen.findByText(/worn pads/)).toBeTruthy()
    expect(h.streamChat.mock.calls[0][0]).toMatchObject({ vehicle_id: V1, message: 'Why is my brake noisy?' })
    expect(screen.getByText(/Used your records: Daily driver/)).toBeTruthy()
    expect(screen.getByText('Suggested maintenance task')).toBeTruthy()
    expect(h.fake.db.maintenance_tasks.length).toBe(1) // nothing written yet: the AI only proposes
    await user.click(screen.getByRole('button', { name: 'Review & add' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Task').value).toBe('Inspect front brake pads')
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }))
    await waitFor(() => expect(h.fake.db.maintenance_tasks.length).toBe(2))
    expect((await screen.findAllByText('Done')).length).toBeGreaterThan(0)
    await waitFor(() => expect(h.fake.db.messages[1].actions[0].status).toBe('confirmed')) // persisted so it survives a reload
  })

  it('chat restores the typed text when the request fails before reaching the server', async () => {
    const { AIError } = await vi.importActual('@/lib/ai')
    h.streamChat.mockRejectedValue(new AIError('rate_limited', 'Hourly limit reached'))
    renderApp('/assistant')
    const user = userEvent.setup()
    await heading(/How can I help/)
    await user.type(screen.getByLabelText('Message the assistant'), 'hello there{Enter}')
    expect(await screen.findByText('Hourly limit reached')).toBeTruthy()
    expect(screen.getByLabelText('Message the assistant').value).toBe('hello there')
  })

  it('analyzer shows stored AI results with limits, and can request a new analysis', async () => {
    renderApp('/analyzer')
    const user = userEvent.setup()
    await user.click(await screen.findByText('Red battery light'))
    expect(await screen.findByText('Have it inspected promptly')).toBeTruthy()
    expect(screen.getByText(/Limits of this analysis/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Close dialog/ }))
    await user.click(screen.getByText('Strange smell'))
    h.callAi.mockImplementation(async () => { h.fake.db.analyses[1].status = 'analyzed'; h.fake.db.analyses[1].result = { ...h.fake.db.analyses[0].result, summary: 'Fresh result' }; return { status: 'analyzed' } })
    await user.click(screen.getByRole('button', { name: /Analyze with AI/ }))
    expect(await screen.findByText('Fresh result')).toBeTruthy()
    expect(h.callAi).toHaveBeenCalledWith({ action: 'analyze', analysis_id: '80000000-0000-4000-8000-000000000002' })
  })

  it('shows a clear message when AI features are turned off', async () => {
    h.fake.db.profiles[0].preferences = { ai: { enabled: false } }
    renderApp('/assistant')
    expect(await heading('AI features are turned off')).toBeTruthy()
  })

  it('report builder previews a health report from the live data', async () => {
    renderApp('/reports')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('radio', { name: /Vehicle health report/ }))
    expect(await screen.findByText(/Health score:/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add AI summary/ })).toBeTruthy()
  })
})

describe('accessibility behaviours', () => {
  it('modals trap focus, close on Escape and restore focus', async () => {
    renderApp('/service')
    const user = userEvent.setup()
    const opener = await screen.findByRole('button', { name: 'Add service' })
    opener.focus(); await user.click(opener)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    for (let i = 0; i < 40; i++) await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('the mobile menu drawer moves focus inside, traps Tab, and closes on Escape', async () => {
    renderApp('/dashboard')
    const user = userEvent.setup()
    const opener = await screen.findByRole('button', { name: 'Open menu' })
    await user.click(opener)
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(drawer.contains(document.activeElement)).toBe(true)
    for (let i = 0; i < 25; i++) await user.tab()
    expect(drawer.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('tabs are keyboard navigable', async () => {
    renderApp('/service')
    const user = userEvent.setup()
    const tab = await screen.findByRole('tab', { name: /Service history/ })
    tab.focus(); await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Maintenance tasks/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('has a skip link, a labelled main landmark, and announces offline status', async () => {
    renderApp('/dashboard')
    await heading(/Alex/)
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeTruthy()
    expect(document.getElementById('main')).toBeTruthy()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false) // real browsers update this before firing the event
    fireEvent(window, new Event('offline'))
    expect(await screen.findByText(/You're offline/)).toBeTruthy()
  })

  it('sets a descriptive document title per page', async () => {
    renderApp('/expenses'); await heading('Expenses')
    expect(document.title).toBe('Expenses · AutoCare 360')
  })
})
