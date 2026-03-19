'use client'

import { useState, useEffect } from 'react'

type Request = {
  id: number
  name: string | null
  contact: string | null
  message: string
  done: boolean
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'))
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function AdminPanel() {
  const [secret, setSecret] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  async function fetchRequests() {
    const res = await fetch('/api/requests')
    const body = await res.json()
    if (body.ok) {
      setRequests(body.data)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  function handleUnlock() {
    setUnlocked(true)
  }

  async function markDone(id: number) {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': secret },
    })
    const body = await res.json()
    if (body.ok) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, done: true } : r))
    }
  }

  async function deleteRequest(id: number) {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': secret },
    })
    const body = await res.json()
    if (body.ok) {
      setRequests(prev => prev.filter(r => r.id !== id))
    }
  }

  const pending = requests.filter(r => !r.done)
  const completed = requests.filter(r => r.done)

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Requests</h1>
        <span className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {pending.length} pending
        </span>
      </div>

      {pending.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No pending requests. You&apos;re all caught up! 🎉</p>
      )}

      {pending.map(r => (
        <div key={r.id} className="bg-white rounded-xl p-4 mb-3 border-l-4 border-purple-400 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">{r.message}</p>
            <p className="text-xs text-gray-400">
              {r.name || 'Anonymous'}
              {r.contact && ` · ${r.contact}`}
              {` · ${timeAgo(r.createdAt)}`}
            </p>
          </div>
          {unlocked && (
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => markDone(r.id)}
                className="bg-green-50 text-green-500 text-xs font-semibold px-2 py-1 rounded"
              >
                ✓ Done
              </button>
              <button
                onClick={() => deleteRequest(r.id)}
                className="bg-red-50 text-red-400 text-xs font-semibold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      {completed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3 block"
          >
            {showCompleted ? '▾' : '▸'} Show completed ({completed.length})
          </button>

          {showCompleted && completed.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 mb-3 border-l-4 border-gray-200 shadow-sm flex justify-between items-start opacity-60">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 line-through">{r.message}</p>
                <p className="text-xs text-gray-400">
                  {r.name || 'Anonymous'}
                  {r.contact && ` · ${r.contact}`}
                  {` · ${timeAgo(r.createdAt)}`}
                </p>
              </div>
              {unlocked && (
                <button
                  onClick={() => deleteRequest(r.id)}
                  className="bg-red-50 text-red-400 text-xs font-semibold px-2 py-1 rounded ml-4 flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
        <span>🔑</span>
        <input
          type="password"
          placeholder="enter secret word"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          className="border border-gray-200 rounded px-2 py-1 text-sm w-36 focus:outline-none"
        />
        <button
          onClick={handleUnlock}
          className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded"
        >
          Unlock
        </button>
        {unlocked && <span className="text-green-500 font-semibold text-xs">✓ unlocked — admin actions enabled</span>}
      </div>
    </div>
  )
}
