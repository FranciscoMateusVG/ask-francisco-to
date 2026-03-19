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
  const [loading, setLoading] = useState(true)

  async function fetchRequests() {
    const res = await fetch('/api/requests')
    const body = await res.json()
    if (body.ok) {
      setRequests(body.data)
    }
    setLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">📋 Request Dashboard</h1>
          <p className="text-purple-300 text-sm">
            {loading ? 'Loading...' : `${pending.length} pending · ${completed.length} completed`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-4">
        {/* Admin unlock bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-3 mb-6">
          <span className="text-lg">🔑</span>
          <input
            type="password"
            placeholder="enter secret word"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
          <button
            onClick={handleUnlock}
            className="bg-gradient-to-r from-purple-500 to-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-800 transition-all"
          >
            Unlock
          </button>
          {unlocked && (
            <span className="text-green-500 font-semibold text-sm flex items-center gap-1">
              ✓ Admin mode
            </span>
          )}
          {!unlocked && (
            <span className="text-gray-400 text-xs ml-auto hidden sm:block">
              Unlock to manage requests
            </span>
          )}
        </div>

        {/* Pending section */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Pending
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
              {pending.length}
            </span>
          </h2>

          {!loading && pending.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
              <p className="text-3xl mb-3">🎉</p>
              <p className="text-gray-500 text-sm font-medium">No pending requests</p>
              <p className="text-gray-400 text-xs mt-1">You&apos;re all caught up!</p>
            </div>
          )}

          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-5 border-l-4 border-purple-400 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed mb-2">{r.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{r.name || 'Anonymous'}</span>
                    {r.contact && (
                      <>
                        <span>·</span>
                        <span>{r.contact}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
                {unlocked && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => markDone(r.id)}
                      className="bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      ✓ Done
                    </button>
                    <button
                      onClick={() => deleteRequest(r.id)}
                      className="bg-red-50 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Completed section */}
        {completed.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2 hover:text-gray-500 transition-colors"
            >
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              {showCompleted ? '▾' : '▸'} Completed
              <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {completed.length}
              </span>
            </button>

            {showCompleted && (
              <div className="space-y-3">
                {completed.map(r => (
                  <div key={r.id} className="bg-white rounded-xl p-5 border-l-4 border-gray-200 shadow-sm opacity-50 hover:opacity-70 transition-opacity flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 leading-relaxed mb-2 line-through">{r.message}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{r.name || 'Anonymous'}</span>
                        {r.contact && (
                          <>
                            <span>·</span>
                            <span>{r.contact}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                    {unlocked && (
                      <button
                        onClick={() => deleteRequest(r.id)}
                        className="bg-red-50 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
