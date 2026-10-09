// A small in-memory stand-in for supabase-js: enough of the query builder, auth and storage API
// for the app to run end-to-end in tests. Row Level Security itself is tested separately (tests/sql).
const iso = (offsetDays = 0) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const day = iso

export const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'alex@example.com', user_metadata: { full_name: 'Alex Kumar' } }
export const V1 = '10000000-0000-4000-8000-000000000001'
export const V2 = '10000000-0000-4000-8000-000000000002'
const ts = () => new Date().toISOString()

export function makeSeed() {
  const u = USER.id
  return {
    profiles: [{ id: u, email: USER.email, full_name: 'Alex Kumar', avatar_path: null, preferences: {}, created_at: ts(), updated_at: ts() }],
    vehicles: [
      { id: V1, user_id: u, nickname: 'Daily driver', make: 'Honda', model: 'City', variant: 'VX', manufacturing_year: 2021, registration_number: 'KA01AB1234', fuel_type: 'petrol', transmission: 'manual',
        odometer_km: 65000, purchase_date: '2021-03-01', purchase_price: 1100000, image_path: null, vin: null, insurance_provider: 'Acko', insurance_policy_number: 'P-1', insurance_expiry: iso(12),
        puc_expiry: iso(-3), warranty_provider: null, warranty_expiry: iso(200), warranty_notes: null, notes: 'Garage queen', created_at: ts(), updated_at: ts() },
      { id: V2, user_id: u, nickname: 'Weekend bike', make: 'Royal Enfield', model: 'Classic 350', variant: null, manufacturing_year: 2019, registration_number: null, fuel_type: 'petrol', transmission: 'manual',
        odometer_km: 8000, purchase_date: null, purchase_price: null, image_path: null, vin: null, insurance_provider: null, insurance_policy_number: null, insurance_expiry: null,
        puc_expiry: null, warranty_provider: null, warranty_expiry: null, warranty_notes: null, notes: null, created_at: ts(), updated_at: ts() },
    ],
    service_records: [
      { id: '20000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, service_date: iso(-60), odometer_km: 60000, service_type: 'routine', service_center: 'Honda Care', labour_cost: 1000,
        parts: [{ name: 'Oil filter', qty: 1, cost: 400 }], total_cost: 1400, notes: 'All good', next_service_date: iso(-5), next_service_odometer_km: 70000, invoice_path: 'u/invoice.pdf', created_at: ts(), updated_at: ts() },
    ],
    maintenance_tasks: [
      { id: '30000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, title: 'Replace brake pads', category: 'brakes', status: 'pending', due_date: iso(-2), due_odometer_km: null, notes: null, completed_at: null, created_at: ts(), updated_at: ts() },
    ],
    vehicle_issues: [
      { id: '40000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, title: 'Brake noise', description: 'Squeals at low speed', severity: 'high', status: 'open', reported_at: iso(-3), resolved_at: null, created_at: ts(), updated_at: ts() },
    ],
    reminders: [{ id: '50000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: null, title: 'Renew road tax', due_date: iso(6), notes: null, status: 'active', created_at: ts(), updated_at: ts() }],
    expenses: [{ id: '60000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, expense_date: iso(-10), category: 'fuel', amount: 3200, description: 'Full tank', receipt_path: null, created_at: ts(), updated_at: ts() }],
    vehicle_documents: [{ id: '70000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, title: 'Insurance policy', category: 'insurance', file_path: 'u/policy.pdf', file_name: 'policy.pdf', mime_type: 'application/pdf', size_bytes: 120000, notes: null, created_at: ts(), updated_at: ts() }],
    analyses: [
      { id: '80000000-0000-4000-8000-000000000001', user_id: u, vehicle_id: V1, analysis_type: 'warning_light', title: 'Red battery light', description: 'Came on after cold start', files: [{ path: 'u/a.jpg', name: 'a.jpg', type: 'image/jpeg', size: 1000 }], status: 'analyzed',
        result: { summary: 'A red battery symbol is visible.', observations: ['Red battery icon'], possible_causes: [{ cause: 'Charging fault', likelihood: 'high', reasoning: 'Typical for this symbol' }], urgency: 'inspect_promptly', confidence: 'medium',
          recommended_steps: ['Check battery terminals'], questions_to_ask_a_mechanic: [], limitations: 'Photo only.', suggested_issue: { title: 'Battery warning light', severity: 'high' }, model: 'test', generated_at: ts() }, created_at: ts(), updated_at: ts() },
      { id: '80000000-0000-4000-8000-000000000002', user_id: u, vehicle_id: null, analysis_type: 'general', title: 'Strange smell', description: null, files: [{ path: 'u/b.pdf', name: 'b.pdf', type: 'application/pdf', size: 1000 }], status: 'awaiting_analysis', result: null, created_at: ts(), updated_at: ts() },
    ],
    conversations: [], messages: [],
  }
}

const DEFAULTS = {
  vehicles: { odometer_km: 0 }, service_records: { labour_cost: 0, parts: [], total_cost: 0, service_type: 'routine' }, maintenance_tasks: { status: 'pending', completed_at: null },
  vehicle_issues: { status: 'open', resolved_at: null }, reminders: { status: 'active' }, analyses: { status: 'awaiting_analysis', result: null },
}
const CHILDREN = ['service_records', 'maintenance_tasks', 'vehicle_issues', 'expenses', 'vehicle_documents', 'analyses', 'conversations', 'reminders']

export function createFakeSupabase({ signedIn = true, seed = makeSeed() } = {}) {
  const db = seed
  const calls = { uploads: [], removes: [] }
  const listeners = new Set()
  const session = () => (state.signedIn ? { access_token: 'test-token', user: USER } : null)
  const state = { signedIn }
  const emit = (event) => listeners.forEach((cb) => cb(event, session()))

  const cascade = (table, gone) => {
    const ids = gone.map((r) => r.id)
    if (table === 'vehicles') for (const t of CHILDREN) db[t] = (db[t] ?? []).filter((r) => !ids.includes(r.vehicle_id))
    if (table === 'conversations') db.messages = db.messages.filter((m) => !ids.includes(m.conversation_id))
  }

  function builder(table) {
    const st = { op: 'select', filters: [], orders: [], from: 0, to: Infinity, payload: null, mode: 'many' }
    const matching = () => (db[table] ??= []).filter((r) => st.filters.every((f) => f(r)))
    const run = () => {
      let data
      if (st.op === 'insert') {
        db[table] ??= []
        data = [].concat(st.payload).map((p) => ({ id: crypto.randomUUID(), created_at: ts(), updated_at: ts(), ...DEFAULTS[table], ...p }))
        db[table].push(...data)
      } else if (st.op === 'update') {
        data = matching(); data.forEach((r) => Object.assign(r, st.payload, { updated_at: ts() }))
      } else if (st.op === 'delete') {
        data = matching(); db[table] = db[table].filter((r) => !data.includes(r)); cascade(table, data)
      } else {
        data = [...matching()]
        for (const [col, asc] of [...st.orders].reverse()) data.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
        data = data.slice(st.from, st.to === Infinity ? undefined : st.to + 1)
      }
      if (st.mode === 'single') {
        if (data.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
        data = data[0]
      } else if (st.mode === 'maybe') data = data[0] ?? null
      return { data: structuredClone(data), error: null }
    }
    const q = {
      select() { return q }, insert(p) { st.op = 'insert'; st.payload = p; return q }, update(p) { st.op = 'update'; st.payload = p; return q }, delete() { st.op = 'delete'; return q },
      eq(c, v) { st.filters.push((r) => r[c] === v); return q }, gte(c, v) { st.filters.push((r) => r[c] >= v); return q }, lt(c, v) { st.filters.push((r) => r[c] < v); return q },
      order(c, { ascending = true } = {}) { st.orders.push([c, ascending]); return q }, limit(n) { st.to = n - 1; return q }, range(a, b) { st.from = a; st.to = b; return q },
      single() { st.mode = 'single'; return q }, maybeSingle() { st.mode = 'maybe'; return q },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) },
    }
    return q
  }

  return {
    db, calls, state,
    from: builder,
    auth: {
      getSession: async () => ({ data: { session: session() } }),
      onAuthStateChange: (cb) => { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } } },
      signInWithPassword: async ({ password }) => {
        if (password !== 'correct-password') return { data: {}, error: { message: 'Invalid login credentials' } }
        state.signedIn = true; emit('SIGNED_IN'); return { data: { session: session(), user: USER }, error: null }
      },
      signUp: async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }),
      signOut: async () => { state.signedIn = false; emit('SIGNED_OUT'); return { error: null } },
      updateUser: async () => ({ data: {}, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
    },
    storage: {
      from: (bucket) => ({
        upload: async (path) => { calls.uploads.push([bucket, path]); return { data: { path }, error: null } },
        remove: async (paths) => { calls.removes.push([bucket, paths]); return { data: [], error: null } },
        createSignedUrl: async () => ({ data: { signedUrl: 'https://files.example.test/signed' }, error: null }),
        download: async () => ({ data: new Blob(['x']), error: null }),
      }),
    },
  }
}
