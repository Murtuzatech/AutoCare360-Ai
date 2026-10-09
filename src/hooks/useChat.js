import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { streamChat } from '@/lib/ai'
import { useToast } from '@/contexts/ToastContext'

const EMPTY_DRAFT = { text: '', actions: [], resources: null, meta: {} }

/** All client-side chat state. The server owns persistence of conversations and messages; this hook only reads them. */
export function useChat() {
  const toast = useToast()
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [draft, setDraft] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [restoreText, setRestoreText] = useState('')
  const abortRef = useRef(null)
  const activeRef = useRef(null)
  activeRef.current = activeId

  const loadConversations = useCallback(async () => {
    const { data, error: err } = await supabase.from('conversations').select('id,title,vehicle_id,updated_at').order('updated_at', { ascending: false }).limit(50)
    if (!err) setConversations(data)
    setConvLoading(false)
  }, [])
  useEffect(() => { loadConversations() }, [loadConversations])

  const loadMessages = useCallback(async (id) => {
    const { data, error: err } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
    if (err) { toast.error('Could not load this conversation.'); return [] }
    return data
  }, [toast])

  const openConversation = useCallback(async (id) => {
    abortRef.current?.abort()
    setActiveId(id); setError(null); setDraft(null); setMessages([]); setMsgLoading(true)
    const conv = conversations.find((c) => c.id === id)
    setVehicleId(conv?.vehicle_id ?? '')
    setMessages(await loadMessages(id))
    setMsgLoading(false)
  }, [conversations, loadMessages])

  const newChat = useCallback(() => {
    abortRef.current?.abort()
    setActiveId(null); setMessages([]); setDraft(null); setError(null); setSending(false)
  }, [])

  const send = useCallback(async (text, { regenerate = false } = {}) => {
    setError(null); setSending(true); setRestoreText('')
    const controller = new AbortController()
    abortRef.current = controller
    const tempId = `tmp-${crypto.randomUUID()}`
    if (!regenerate) setMessages((m) => [...m, { id: tempId, role: 'user', content: text, actions: [], meta: {}, created_at: new Date().toISOString() }])
    setDraft({ ...EMPTY_DRAFT })

    let convId = activeRef.current
    let reachedServer = false
    let failure = null
    try {
      await streamChat({ conversation_id: activeRef.current, vehicle_id: vehicleId || null, message: text, regenerate }, {
        signal: controller.signal,
        onEvent: ({ event, data }) => {
          if (event === 'meta') { reachedServer = true; convId = data.conversation_id; setActiveId(data.conversation_id); setDraft((d) => ({ ...d, meta: data })) }
          else if (event === 'text') setDraft((d) => ({ ...d, text: d.text + data.text }))
          else if (event === 'action') setDraft((d) => ({ ...d, actions: [...d.actions, data] }))
          else if (event === 'resources') setDraft((d) => ({ ...d, resources: data }))
          else if (event === 'error') failure = data
        },
      })
    } catch (err) {
      failure = err.name === 'AbortError' ? { aborted: true, message: 'Response stopped. Press retry to get an answer.' } : { message: err.message, code: err.code }
    }

    if (convId && (reachedServer || regenerate || activeRef.current)) {
      setMessages(await loadMessages(convId))
      loadConversations()
    } else if (failure) {
      // The request never reached the server, so nothing was saved: put the text back so it isn't lost.
      setMessages((m) => m.filter((x) => x.id !== tempId))
      if (!regenerate) setRestoreText(text)
    }
    setDraft(null); setSending(false)
    if (failure) setError({ message: failure.message ?? 'Something went wrong.', canRetry: Boolean(convId) })
  }, [vehicleId, loadMessages, loadConversations])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const regenerate = useCallback(async () => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (last && !String(last.id).startsWith('tmp-')) {
      const { error: err } = await supabase.from('messages').delete().eq('id', last.id)
      if (err) { toast.error('Could not regenerate this reply.'); return }
      setMessages((m) => m.filter((x) => x.id !== last.id))
    }
    await send(null, { regenerate: true })
  }, [messages, send, toast])

  const clearConversation = useCallback(async () => {
    if (!activeId) return
    const { error: err } = await supabase.from('messages').delete().eq('conversation_id', activeId)
    if (err) { toast.error('Could not clear the conversation.'); return }
    setMessages([]); setError(null)
  }, [activeId, toast])

  const deleteConversation = useCallback(async (id) => {
    const { error: err } = await supabase.from('conversations').delete().eq('id', id)
    if (err) { toast.error('Could not delete the conversation.'); return }
    if (id === activeRef.current) newChat()
    loadConversations()
  }, [loadConversations, newChat, toast])

  // Persist the user's choice on an action card. The next value is computed from a ref (not inside a state updater,
  // which React may run later) so the database write always happens, and a reload shows the card as confirmed/dismissed.
  const messagesRef = useRef([])
  messagesRef.current = messages
  const updateAction = useCallback(async (messageId, actionId, status) => {
    const msg = messagesRef.current.find((m) => m.id === messageId)
    if (!msg) return
    const next = msg.actions.map((a) => (a.id === actionId ? { ...a, status } : a))
    setMessages((list) => list.map((m) => (m.id === messageId ? { ...m, actions: next } : m)))
    const { error: err } = await supabase.from('messages').update({ actions: next }).eq('id', messageId)
    if (err) toast.error('Could not save that choice. It may reappear after a refresh.')
  }, [toast])

  return {
    conversations, convLoading, activeId, messages, msgLoading, vehicleId, setVehicleId, draft, sending, error, restoreText,
    send, stop, regenerate, newChat, openConversation, clearConversation, deleteConversation, updateAction,
  }
}
