'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export function RequestForm() {
  const [state, setState] = useState<State>('idle')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')

    if (!message.trim()) {
      setValidationError('Please write your request before sending.')
      return
    }

    setState('loading')

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, message }),
      })

      if (!res.ok) throw new Error('Server error')
      setState('success')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="text-5xl mb-4">🙌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Got it, thanks!</h2>
        <p className="text-gray-500 text-sm">Francisco will see your request. You&apos;re done!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          Your name <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="João Silva"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          How to reach you <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="WhatsApp, email, whatever works..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400"
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          What do you need? <span className="text-purple-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask Francisco to..."
          maxLength={2000}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 resize-none"
        />
        {validationError && (
          <p className="text-red-400 text-xs mt-1">{validationError}</p>
        )}
      </div>

      {state === 'error' && (
        <p className="text-red-400 text-sm mb-3 text-center">Something went wrong, please try again.</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-60"
      >
        {state === 'loading' ? 'Sending...' : 'Send Request ✨'}
      </button>

      <p className="text-center text-xs text-gray-300 mt-3">* only the request is required</p>
    </form>
  )
}
