import { AIProviderError } from './provider.ts'
import type { AIProvider, ChatEvent, ChatMessage, Part, ToolDeclaration } from './provider.ts'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface GeminiOptions { apiKey: string; model: string; fetchImpl?: typeof fetch }

/** Gemini requires alternating roles starting with 'user'. Merge consecutive same-role turns. */
export function toContents(messages: ChatMessage[]) {
  const out: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    const text = m.text.trim()
    if (!text) continue
    const last = out[out.length - 1]
    if (last && last.role === role) last.parts[0].text += `\n\n${text}`
    else out.push({ role, parts: [{ text }] })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

function mapHttpError(status: number): AIProviderError {
  if (status === 429) return new AIProviderError(429, 'provider_busy', 'The AI service is busy right now. Please try again in a moment.')
  if (status === 400 || status === 401 || status === 403 || status === 404)
    return new AIProviderError(502, 'provider_config', 'The AI service rejected the request. Check the API key and model name in the Edge Function settings.')
  return new AIProviderError(502, 'provider_unavailable', 'The AI service is temporarily unavailable. Please try again.')
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  private apiKey: string
  readonly model: string
  private fetchImpl: typeof fetch

  constructor(opts: GeminiOptions) {
    this.apiKey = opts.apiKey
    this.model = opts.model
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private async post(path: string, body: unknown, signal?: AbortSignal) {
    const retryableStatuses = [429, 500, 502, 503, 504]
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response
      try {
        res = await this.fetchImpl(`${BASE}/models/${this.model}:${path}`, {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify(body),
        })
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err
        throw new AIProviderError(502, 'provider_unavailable', 'Could not reach the AI service. Please try again.')
      }
      if (res.ok) return res

      console.error('Gemini error', res.status, (await res.text()).split(this.apiKey).join('[redacted]').slice(0, 500)) // server log only
      if (!retryableStatuses.includes(res.status) || attempt === 2) throw mapHttpError(res.status)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
    }
    throw new AIProviderError(502, 'provider_unavailable', 'The AI service is temporarily unavailable. Please try again.')
  }

  async *streamChat({ system, messages, tools, signal }: Parameters<AIProvider['streamChat']>[0]): AsyncGenerator<ChatEvent> {
    const contents = toContents(messages)
    if (!contents.length) throw new AIProviderError(400, 'empty', 'There is nothing to send.')
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }
    if (tools?.length) {
      body.tools = [{ functionDeclarations: tools }]
      body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } }
    }
    const res = await this.post('streamGenerateContent?alt=sse', body, signal)
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finish = 'STOP'

    const handle = function* (payload: string): Generator<ChatEvent> {
      let chunk: any
      try { chunk = JSON.parse(payload) } catch { return }
      if (chunk.promptFeedback?.blockReason) { yield { type: 'blocked', reason: String(chunk.promptFeedback.blockReason) }; return }
      const cand = chunk.candidates?.[0]
      for (const part of cand?.content?.parts ?? []) {
        if (typeof part.text === 'string' && part.text) yield { type: 'text', text: part.text }
        else if (part.functionCall?.name) yield { type: 'tool_call', name: part.functionCall.name, args: part.functionCall.args ?? {} }
      }
      if (cand?.finishReason) finish = cand.finishReason
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() ?? ''
      for (const ev of events) {
        const data = ev.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
        if (data) yield* handle(data)
      }
    }
    const tail = buffer.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
    if (tail) yield* handle(tail)

    if (['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST'].includes(finish)) yield { type: 'blocked', reason: finish }
    yield { type: 'done', finishReason: finish }
  }

  async generateJson<T>({ system, parts, schema, signal }: Parameters<AIProvider['generateJson']>[0]): Promise<T> {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json', responseSchema: schema },
    }
    const res = await this.post('generateContent', body, signal)
    const data = await res.json()
    if (data.promptFeedback?.blockReason) throw new AIProviderError(422, 'blocked', 'The AI service could not process this content.')
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    try { return JSON.parse(text) as T }
    catch { throw new AIProviderError(502, 'bad_output', 'The AI service returned an unreadable answer. Please try again.') }
  }
}
