'use client'

import { useState } from 'react'
import { RequestForm } from '@/components/RequestForm'
import { TaskList } from '@/components/TaskList'

type Tab = 'submit' | 'tasks'

export default function Home() {
  const [tab, setTab] = useState<Tab>('submit')

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 flex flex-col items-center px-4 py-12">
      <h1 className="text-white text-3xl font-bold mb-2">✉️ Ask Francisco To...</h1>
      <p className="text-purple-200 text-sm mb-8">Need something done? Submit a ticket below 👋</p>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/10 p-1 rounded-xl mb-8">
        <button
          onClick={() => setTab('submit')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'submit'
              ? 'bg-white text-purple-900 shadow'
              : 'text-purple-200 hover:text-white'
          }`}
        >
          Submit a Request
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'tasks'
              ? 'bg-white text-purple-900 shadow'
              : 'text-purple-200 hover:text-white'
          }`}
        >
          My Tasks
        </button>
      </div>

      {tab === 'submit' ? <RequestForm /> : <TaskList />}
    </main>
  )
}
