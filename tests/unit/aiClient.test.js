import assert from 'node:assert'
import { describe, it, vi } from 'vitest'
import { streamChat, callAi, AIError, youtubeUrl } from '@/lib/ai'

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } } }))
vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')

describe('AI client library', () => {
  it('streams SSE events across arbitrary chunk boundaries and maps errors', async () => {
    const enc = new TextEncoder()
    const sse = [
      'event: meta\ndata: {"conversation_id":"c1","context":{"vehicle":"City"},"safety":[]}\n\n',
      'event: text\ndata: {"text":"Hel"}\n\n', 'event: text\ndata: {"text":"lo"}\n\n',
      'event: action\ndata: {"id":"a1","type":"issue","args":{"title":"x"},"status":"proposed"}\n\n',
      'event: done\ndata: {"message_id":"m1"}\n\n',
    ].join('')
    const bytes = enc.encode(sse)
    let seenHeaders
    globalThis.fetch = async (url, init) => {
      seenHeaders = init.headers
      const rs = new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7)); c.close() } }) // tiny chunks split events
      return new Response(rs, { status: 200 })
    }
    const events = []
    await streamChat({ message: 'hi' }, { onEvent: (e) => events.push(e) })
    assert.deepStrictEqual(events.map((e) => e.event), ['meta', 'text', 'text', 'action', 'done'])
    assert.strictEqual(events.filter((e) => e.event === 'text').map((e) => e.data.text).join(''), 'Hello')
    assert.strictEqual(seenHeaders.Authorization, 'Bearer tok')
    assert.ok(!JSON.stringify(seenHeaders).includes('service_role'))

    // error mapping
    globalThis.fetch = async () => new Response('{"code":"NOT_FOUND","message":"Requested function was not found"}', { status: 404 })
    await assert.rejects(() => callAi({ action: 'insights' }), (e) => e instanceof AIError && e.code === 'not_deployed' && /docs\/AI_SETUP/.test(e.message))
    globalThis.fetch = async () => new Response('{"error":{"code":"rate_limited","message":"Slow down"}}', { status: 429 })
    await assert.rejects(() => callAi({ action: 'insights' }), (e) => e.code === 'rate_limited' && e.message === 'Slow down')
    globalThis.fetch = async () => { throw new TypeError('fetch failed') }
    await assert.rejects(() => callAi({}), (e) => e.code === 'network')
    assert.strictEqual(youtubeUrl('a b'), 'https://www.youtube.com/watch?v=a%20b')

  })
})
