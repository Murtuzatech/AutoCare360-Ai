import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eraser, History, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGarage } from '@/contexts/GarageContext'
import { useChat } from '@/hooks/useChat'
import { Card } from '@/components/ui/Card'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Alert, EmptyState, Skeleton } from '@/components/ui/Feedback'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { Composer } from '@/components/assistant/Composer'
import { ConversationList } from '@/components/assistant/ConversationList'
import { MessageBubble } from '@/components/assistant/MessageBubble'
import { LogoMark } from '@/components/Logo'

function suggestions(vehicle, hasVehicles) {
  if (vehicle) {
    const n = vehicle.nickname
    return [`Summarize ${n}'s service history`, `What maintenance might be due soon for ${n}?`, `Create a pre-trip checklist for ${n}`, `Review ${n}'s spending and suggest ways to save`]
  }
  return hasVehicles
    ? ["What's due or overdue across my vehicles?", 'Summarize the health of my vehicles', 'What does a red battery warning light mean?', 'Create a monthly car-care checklist']
    : ['What does the oil pressure warning light mean?', 'How often should brake fluid be changed?', 'Create a pre-road-trip checklist', 'How do I read a tyre sidewall?']
}

export default function Assistant() {
  const { profile } = useAuth()
  const { vehicles, loading } = useGarage()
  const chat = useChat()
  const ai = profile.preferences.ai
  const [listOpen, setListOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [clearing, setClearing] = useState(false)
  const scroller = useRef(null)
  const stick = useRef(true)

  const vehicle = vehicles.find((v) => v.id === chat.vehicleId)
  const lastAssistantIdx = chat.messages.map((m) => m.role).lastIndexOf('assistant')
  const empty = !chat.msgLoading && chat.messages.length === 0 && !chat.draft

  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.draft])

  if (!ai.enabled) {
    return <Card><EmptyState icon={Sparkles} title="AI features are turned off" description="Turn them on in Settings to chat with the assistant, analyze photos and get insights."
      action={<Link to="/settings" className={buttonStyles()}>Open Settings</Link>} /></Card>
  }
  if (loading) return <Skeleton className="h-96" />

  const list = (
    <ConversationList conversations={chat.conversations} loading={chat.convLoading} activeId={chat.activeId}
      onOpen={(id) => { chat.openConversation(id); setListOpen(false) }} onNew={() => { chat.newChat(); setListOpen(false) }} onDelete={setDeleting} />
  )

  return (
    <>
    <h1 className="sr-only">AI Assistant</h1>
    <div className="grid grid-cols-1 h-[calc(100dvh-12.5rem)] gap-5 lg:h-[calc(100dvh-9rem)] lg:grid-cols-[17rem_1fr]">
      <Card className="hidden overflow-hidden lg:block">{list}</Card>

      <Card className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <button onClick={() => setListOpen(true)} className="flex h-9 items-center gap-1.5 rounded-ctl px-2 text-sm text-muted hover:bg-surface-2 lg:hidden" aria-label="Open conversations"><History className="h-4 w-4" />Chats</button>
          <div className="min-w-0 flex-1">
            <Select aria-label="Vehicle context" value={chat.vehicleId} onChange={(e) => chat.setVehicleId(e.target.value)} className="max-w-xs [&_select]:h-9">
              <option value="">No specific vehicle</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={chat.newChat} className="lg:hidden" aria-label="New conversation"><Plus className="h-4 w-4" /></Button>
          {chat.messages.length > 0 && <Button variant="ghost" size="sm" onClick={() => setClearing(true)} disabled={chat.sending}><Eraser className="h-4 w-4" /><span className="hidden sm:inline">Clear</span></Button>}
        </div>

        <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120 }}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-5 sm:px-5" aria-live="polite">
          {chat.msgLoading && <div className="space-y-4"><Skeleton className="ml-auto h-10 w-2/3" /><Skeleton className="h-24 w-full" /></div>}

          {empty && (
            <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center">
              <LogoMark size={44} />
              <h2 className="mt-4 text-2xl font-semibold">How can I help{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}?</h2>
              <p className="mt-1.5 text-sm text-muted">
                {!ai.useVehicleContext ? 'Sharing your vehicle data is turned off, so I will answer in general terms.'
                  : vehicle ? `I'll use ${vehicle.nickname}'s records to answer.` : vehicles.length ? 'Pick a vehicle above to ground my answers in its records.' : 'Add a vehicle to get answers based on your own records.'}
              </p>
              <div className="mt-6 grid grid-cols-1 w-full gap-2 sm:grid-cols-2">
                {suggestions(vehicle, vehicles.length > 0).map((s) => (
                  <button key={s} onClick={() => chat.send(s)} className="rounded-ctl border border-line bg-surface p-3 text-left text-sm hover:border-brand/50 hover:bg-surface-2">{s}</button>
                ))}
              </div>
            </div>
          )}

          {chat.messages.map((m, i) => (
            <MessageBubble key={m.id} message={m} isLast={i === lastAssistantIdx && !chat.draft} canRegenerate busy={chat.sending}
              onRegenerate={chat.regenerate} onActionStatus={chat.updateAction} />
          ))}
          {chat.draft && <MessageBubble message={{ role: 'assistant', content: chat.draft.text, actions: chat.draft.actions, meta: { context: chat.draft.meta.context, safety: chat.draft.meta.safety, resources: chat.draft.resources } }} streaming />}

          {chat.error && (
            <Alert>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{chat.error.message}</span>
                {chat.error.canRetry && <Button size="sm" variant="secondary" onClick={chat.regenerate} disabled={chat.sending}>Retry</Button>}
              </div>
            </Alert>
          )}
        </div>

        <div className="border-t border-line p-3 sm:p-4">
          <Composer onSend={(t) => chat.send(t)} onStop={chat.stop} sending={chat.sending} restoreText={chat.restoreText} />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>AutoCare AI can make mistakes and is not a certified mechanic. For brakes, steering, tyres, fuel, smoke or warning lights, get a professional inspection. Messages and relevant records are sent to Google Gemini.</span>
          </p>
        </div>
      </Card>

      <Modal open={listOpen} onClose={() => setListOpen(false)} title="Conversations"><div className="-m-5 h-[60vh]">{list}</div></Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete conversation?" onCancel={() => setDeleting(null)} message={`"${deleting?.title ?? ''}" and its messages will be permanently deleted.`}
        onConfirm={async () => { await chat.deleteConversation(deleting.id); setDeleting(null) }} />
      <ConfirmDialog open={clearing} title="Clear this conversation?" confirmLabel="Clear" onCancel={() => setClearing(false)} message="All messages in this conversation will be deleted. This can't be undone."
        onConfirm={async () => { await chat.clearConversation(); setClearing(false) }} />
    </div>
    </>
  )
}
