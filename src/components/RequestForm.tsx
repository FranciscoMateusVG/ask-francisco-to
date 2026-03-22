'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'
type TicketType = 'bug' | 'new_feature' | 'improvement' | 'question' | 'pedido' | ''
type Priority = 'low' | 'medium' | 'high' | 'critical'

export function RequestForm() {
  const [state, setState] = useState<State>('idle')

  // Requester info
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')

  // Core ticket fields
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [ticketType, setTicketType] = useState<TicketType>('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [affectedArea, setAffectedArea] = useState('')

  // Bug-specific fields
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')

  const [validationError, setValidationError] = useState('')

  const isBug = ticketType === 'bug'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')

    if (!title.trim()) {
      setValidationError('Por favor, informe um título para seu pedido.')
      return
    }
    if (!message.trim()) {
      setValidationError('Por favor, descreva seu pedido em detalhes.')
      return
    }
    if (!ticketType) {
      setValidationError('Por favor, selecione um tipo.')
      return
    }

    setState('loading')

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact,
          title: title.trim(),
          message: message.trim(),
          ticket_type: ticketType,
          priority,
          affected_area: affectedArea.trim() || undefined,
          steps_to_reproduce: isBug ? stepsToReproduce.trim() || undefined : undefined,
          expected_behavior: isBug ? expectedBehavior.trim() || undefined : undefined,
          actual_behavior: isBug ? actualBehavior.trim() || undefined : undefined,
        }),
      })

      if (!res.ok) throw new Error('Server error')
      setState('success')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl text-center">
        <div className="text-5xl mb-4">🙌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Recebido, obrigado!</h2>
        <p className="text-gray-500 text-sm">Francisco verá seu pedido. Pronto!</p>
      </div>
    )
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1'
  const selectClass = `${inputClass} bg-white`

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Type */}
        <div>
          <label className={labelClass}>
            Tipo <span className="text-purple-400">*</span>
          </label>
          <select
            value={ticketType}
            onChange={e => setTicketType(e.target.value as TicketType)}
            className={selectClass}
            data-testid="ticket-type"
          >
            <option value="">Selecione o tipo...</option>
            <option value="pedido">📋 Pedido</option>
            <option value="bug">🐛 Bug</option>
            <option value="new_feature">✨ Nova Funcionalidade</option>
            <option value="improvement">🔧 Melhoria</option>
            <option value="question">❓ Dúvida</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className={labelClass}>Prioridade</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
            className={selectClass}
            data-testid="priority"
          >
            <option value="low">🟢 Baixa</option>
            <option value="medium">🟡 Média</option>
            <option value="high">🟠 Alta</option>
            <option value="critical">🔴 Crítica</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className={labelClass}>
          Título <span className="text-purple-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Descrição curta do pedido"
          maxLength={200}
          className={inputClass}
          data-testid="title"
        />
      </div>

      {/* Affected Area */}
      <div className="mb-4">
        <label className={labelClass}>
          Área afetada / módulo / tela <span className="text-gray-300 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={affectedArea}
          onChange={e => setAffectedArea(e.target.value)}
          placeholder="Ex: Página de login, API, Dashboard..."
          className={inputClass}
          data-testid="affected-area"
        />
      </div>

      {/* Detailed Description */}
      <div className="mb-4">
        <label className={labelClass}>
          Descrição <span className="text-purple-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Descreva o problema ou pedido em detalhes..."
          maxLength={2000}
          rows={4}
          className={`${inputClass} resize-none`}
          data-testid="message"
        />
      </div>

      {/* Bug-specific fields */}
      {isBug && (
        <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-100 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Detalhes do bug</p>

          <div>
            <label className={labelClass}>Passos para reproduzir <span className="text-gray-300 font-normal">(opcional)</span></label>
            <textarea
              value={stepsToReproduce}
              onChange={e => setStepsToReproduce(e.target.value)}
              placeholder="1. Vá até...&#10;2. Clique em...&#10;3. Veja o erro"
              rows={3}
              className={`${inputClass} resize-none`}
              data-testid="steps-to-reproduce"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Comportamento esperado <span className="text-gray-300 font-normal">(opcional)</span></label>
              <textarea
                value={expectedBehavior}
                onChange={e => setExpectedBehavior(e.target.value)}
                placeholder="O que deveria acontecer..."
                rows={2}
                className={`${inputClass} resize-none`}
                data-testid="expected-behavior"
              />
            </div>
            <div>
              <label className={labelClass}>Comportamento atual <span className="text-gray-300 font-normal">(opcional)</span></label>
              <textarea
                value={actualBehavior}
                onChange={e => setActualBehavior(e.target.value)}
                placeholder="O que realmente acontece..."
                rows={2}
                className={`${inputClass} resize-none`}
                data-testid="actual-behavior"
              />
            </div>
          </div>
        </div>
      )}

      {/* Requester info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className={labelClass}>
            Seu nome <span className="text-gray-300 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="João Silva"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Como te contatar <span className="text-gray-300 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="WhatsApp, email, o que preferir..."
            className={inputClass}
          />
        </div>
      </div>

      {validationError && (
        <p className="text-red-400 text-xs mb-3">{validationError}</p>
      )}

      {state === 'error' && (
        <p className="text-red-400 text-sm mb-3 text-center">Algo deu errado, tente novamente.</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60 hover:from-purple-600 hover:to-purple-800 transition-all"
      >
        {state === 'loading' ? 'Enviando...' : 'Enviar ✨'}
      </button>

      <p className="text-center text-xs text-gray-300 mt-3">* campos obrigatórios</p>
    </form>
  )
}
