// Provider-agnostic AI interface. To add another provider (OpenAI, Anthropic, ...):
// implement AIProvider in a new file and register it in createProvider() below.
import { GeminiProvider } from './gemini.ts'

export interface ChatMessage { role: 'user' | 'assistant'; text: string }

export interface ToolDeclaration {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON-schema style
}

export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'blocked'; reason: string }
  | { type: 'done'; finishReason: string }

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

export interface AIProvider {
  readonly name: string
  readonly model: string
  streamChat(opts: { system: string; messages: ChatMessage[]; tools?: ToolDeclaration[]; signal?: AbortSignal }): AsyncGenerator<ChatEvent>
  generateJson<T = unknown>(opts: { system: string; parts: Part[]; schema: Record<string, unknown>; signal?: AbortSignal }): Promise<T>
}

/** Errors the client may see. `message` is always safe to show; provider internals are logged, never returned. */
export class AIProviderError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

export function createProvider(env: (key: string) => string | undefined): AIProvider {
  const name = (env('AI_PROVIDER') ?? 'gemini').toLowerCase()
  if (name === 'gemini') {
    const apiKey = env('GEMINI_API_KEY')
    if (!apiKey) throw new AIProviderError(503, 'not_configured', 'The AI service is not configured yet (missing GEMINI_API_KEY).')
    return new GeminiProvider({ apiKey, model: env('GEMINI_MODEL') ?? 'gemini-flash-latest' })
  }
  throw new AIProviderError(503, 'not_configured', `Unknown AI provider "${name}".`)
}
