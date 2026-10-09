import { supabase } from './supabase'

export class AIError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

const endpoint = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`

async function headers() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new AIError('unauthorized', 'Please sign in again.')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }
}

async function request(body, signal) {
  let res
  try { res = await fetch(endpoint(), { method: 'POST', headers: await headers(), body: JSON.stringify(body), signal }) }
  catch (err) {
    if (err?.name === 'AbortError') throw err
    if (err instanceof AIError) throw err
    throw new AIError('network', 'Could not reach the AI service. Check your connection and try again.')
  }
  if (!res.ok) {
    let payload = null
    try { payload = await res.json() } catch { /* not JSON */ }
    if (res.status === 404 && !payload?.error) throw new AIError('not_deployed', "The AI service isn't set up yet. Deploy the 'ai' Edge Function (see docs/AI_SETUP.md).")
    throw new AIError(payload?.error?.code ?? `http_${res.status}`, payload?.error?.message ?? 'The AI service returned an error. Please try again.')
  }
  return res
}

/** One-shot JSON actions: analyze, insights, summary. */
export async function callAi(body, signal) {
  return (await request(body, signal)).json()
}

/**
 * Streaming chat. Calls onEvent({ event, data }) for: meta, text, action, resources, done, error.
 * Resolves when the stream ends; throws AIError for transport/HTTP errors.
 */
export async function streamChat(body, { signal, onEvent }) {
  const res = await request({ action: 'chat', ...body }, signal)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const dispatch = (block) => {
    let event = 'message'
    const data = []
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).trim())
    }
    if (!data.length) return
    try { onEvent({ event, data: JSON.parse(data.join('')) }) } catch { /* ignore malformed event */ }
  }
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    blocks.forEach(dispatch)
  }
  if (buffer.trim()) dispatch(buffer)
}

export const youtubeUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
