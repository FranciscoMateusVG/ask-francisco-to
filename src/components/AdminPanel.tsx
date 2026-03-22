'use client'

import { useState } from 'react'

type Ticket = {
  id: number
  name: string | null
  contact: string | null
  message: string
  title: string | null
  ticket_type: string | null
  affected_area: string | null
  steps_to_reproduce: string | null
  expected_behavior: string | null
  actual_behavior: string | null
  priority: string | null
  done: boolean
  createdAt: string
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-yellow-400',
  low:      'bg-green-400',
}

const TYPE_LABEL: Record<string, string> = {
  pedido:      '📋 Pedido',
  bug:         '🐛 Bug',
  new_feature: '✨ Nova Funcionalidade',
  improvement: '🔧 Melhoria',
  question:    '❓ Dúvida',
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'))
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'agora mesmo'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`
  return `${Math.floor(seconds / 86400)}d atrás`
}

export function AdminPanel() {
  const [secret, setSecret] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [unlockError, setUnlockError] = useState(false)

  async function fetchTickets() {
    const res = await fetch('/api/requests', {
      headers: { 'x-admin-secret': secret },
    })
    const body = await res.json()
    if (body.ok) {
      setTickets(body.data)
      return true
    }
    return false
  }

  async function handleUnlock() {
    setUnlockError(false)
    const ok = await fetchTickets()
    if (ok) {
      setUnlocked(true)
    } else {
      setUnlockError(true)
    }
  }

  async function handleRefresh() {
    await fetchTickets()
  }

  async function markDone(id: number) {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': secret },
    })
    const body = await res.json()
    if (body.ok) {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, done: true } : t))
    }
  }

  async function deleteTicket(id: number) {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': secret },
    })
    const body = await res.json()
    if (body.ok) {
      setTickets(prev => prev.filter(t => t.id !== id))
    }
  }

  const pending = tickets.filter(t => !t.done)
  const completed = tickets.filter(t => t.done)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">📋 Painel de Pedidos</h1>
          <p className="text-purple-300 text-sm">
            {unlocked ? (
              <>
                <span>{pending.length} pendente{pending.length !== 1 ? 's' : ''}</span>
                {completed.length > 0 && <span> · {completed.length} concluído{completed.length !== 1 ? 's' : ''}</span>}
              </>
            ) : (
              <span>Entre com a palavra secreta para ver os pedidos</span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-4">
        {/* Unlock bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-3 mb-6">
          <span className="text-lg">🔑</span>
          <input
            type="password"
            placeholder="palavra secreta"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
          <button
            onClick={handleUnlock}
            className="bg-gradient-to-r from-purple-500 to-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-800 transition-all"
          >
            Entrar
          </button>
          {unlocked && (
            <>
              <span className="text-green-500 font-semibold text-sm">✓ desbloqueado</span>
              <button
                onClick={handleRefresh}
                className="ml-auto text-xs text-purple-500 hover:text-purple-700 font-semibold px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 transition-all"
              >
                ↻ Atualizar
              </button>
            </>
          )}
          {unlockError && (
            <span className="text-red-400 text-sm font-medium">Senha incorreta</span>
          )}
          {!unlocked && !unlockError && (
            <span className="text-gray-400 text-xs ml-auto hidden sm:block" aria-hidden="true">
              Digite a palavra secreta para gerenciar
            </span>
          )}
        </div>

        {unlocked && (
          <>
            {/* Pending section */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Pendente
                <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {pending.length}
                </span>
              </h2>

              {pending.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
                  <p className="text-3xl mb-3">🎉</p>
                  <p className="text-gray-500 text-sm font-medium">Nenhum pedido pendente</p>
                  <p className="text-gray-400 text-xs mt-1">Tudo em dia!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map(t => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      onDone={() => markDone(t.id)}
                      onDelete={() => deleteTicket(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Completed section */}
            {completed.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2 hover:text-gray-500 transition-colors"
                >
                  <span className="w-2 h-2 bg-gray-300 rounded-full" />
                  Mostrar concluídos
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {completed.length}
                  </span>
                </button>

                {showCompleted && (
                  <div className="space-y-3">
                    {completed.map(t => (
                      <TicketCard
                        key={t.id}
                        ticket={t}
                        faded
                        onDelete={() => deleteTicket(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type TicketCardProps = {
  ticket: Ticket
  faded?: boolean
  onDone?: () => void
  onDelete: () => void
}

function TicketCard({ ticket: t, faded = false, onDone, onDelete }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const dotClass = PRIORITY_DOT[t.priority ?? 'medium'] ?? PRIORITY_DOT.medium
  const hasBugDetails = t.steps_to_reproduce || t.expected_behavior || t.actual_behavior

  return (
    <div
      className={`bg-white rounded-xl p-5 border-l-4 shadow-sm transition-shadow ${
        faded ? 'border-gray-200 opacity-50 hover:opacity-70' : 'border-purple-400 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          {t.title && (
            <p className={`text-sm font-semibold text-gray-800 mb-0.5 ${faded ? 'line-through' : ''}`}>
              {t.title}
            </p>
          )}
          <p className={`text-sm text-gray-800 leading-relaxed mb-2 ${faded ? 'line-through text-gray-500' : ''}`}>
            {t.message}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {t.ticket_type && (
              <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                {TYPE_LABEL[t.ticket_type] ?? t.ticket_type}
              </span>
            )}
            {t.affected_area && (
              <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                📍 {t.affected_area}
              </span>
            )}
            <span className="font-medium text-gray-500">{t.name || 'Anônimo'}</span>
            {t.contact && (
              <>
                <span>·</span>
                <span>{t.contact}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(t.createdAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              {t.priority ?? 'medium'}
            </span>
          </div>

          {/* Bug details (collapsible) */}
          {hasBugDetails && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-purple-400 hover:text-purple-600 mt-2 underline"
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          )}

          {expanded && (
            <div className="mt-3 space-y-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
              {t.steps_to_reproduce && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Passos: </span>
                  <span className="whitespace-pre-wrap">{t.steps_to_reproduce}</span>
                </div>
              )}
              {t.expected_behavior && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Esperado: </span>
                  <span>{t.expected_behavior}</span>
                </div>
              )}
              {t.actual_behavior && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Atual: </span>
                  <span>{t.actual_behavior}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {onDone && !t.done && (
            <button
              onClick={onDone}
              className="bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              ✓ Concluído
            </button>
          )}
          <button
            onClick={onDelete}
            className="bg-red-50 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
