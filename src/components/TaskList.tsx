'use client'

import { useState, useEffect } from 'react'

type Task = {
  id: number
  name: string | null
  message: string
  title: string | null
  ticket_type: string | null
  affected_area: string | null
  priority: string | null
  done: boolean
  createdAt: string
}

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  critical: { label: 'Crítica',  dot: 'bg-red-500' },
  high:     { label: 'Alta',     dot: 'bg-orange-400' },
  medium:   { label: 'Média',    dot: 'bg-yellow-400' },
  low:      { label: 'Baixa',    dot: 'bg-green-400' },
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

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(body => {
        if (body.ok) setTasks(body.data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  if (loading) {
    return (
      <div className="w-full max-w-2xl text-center py-12">
        <p className="text-purple-300 text-sm animate-pulse">Carregando tarefas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl text-center py-12">
        <p className="text-red-300 text-sm">Erro ao carregar tarefas. Tente novamente.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Pending */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-300 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-400 rounded-full inline-block" />
          Pendente
          <span className="bg-purple-800 text-purple-200 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
            {pending.length}
          </span>
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white/10 rounded-xl border border-white/10 py-10 text-center">
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-purple-200 text-sm font-medium">Nada pendente — tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(v => !v)}
            className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2 hover:text-purple-300 transition-colors"
          >
            <span className="w-2 h-2 bg-purple-700 rounded-full inline-block" />
            {showDone ? '▾' : '▸'} Concluídos
            <span className="bg-purple-900 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
              {done.length}
            </span>
          </button>

          {showDone && (
            <div className="space-y-3">
              {done.map(task => (
                <TaskCard key={task.id} task={task} faded />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, faded = false }: { task: Task; faded?: boolean }) {
  const priorityCfg = PRIORITY_CONFIG[task.priority ?? 'medium'] ?? PRIORITY_CONFIG.medium

  return (
    <div className={`bg-white/10 border border-white/10 rounded-xl p-5 backdrop-blur-sm transition-opacity ${faded ? 'opacity-50 hover:opacity-70' : 'hover:bg-white/15'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {task.title && (
            <p className={`text-sm font-semibold text-white mb-1 ${faded ? 'line-through' : ''}`}>
              {task.title}
            </p>
          )}
          <p className={`text-xs text-purple-200 leading-relaxed ${!task.title ? 'text-sm' : ''} ${faded ? 'line-through' : ''}`}>
            {task.message}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-purple-400">
            {task.ticket_type && (
              <span className="bg-purple-900/60 px-2 py-0.5 rounded-full">
                {TYPE_LABEL[task.ticket_type] ?? task.ticket_type}
              </span>
            )}
            {task.affected_area && (
              <span className="bg-purple-900/60 px-2 py-0.5 rounded-full">
                📍 {task.affected_area}
              </span>
            )}
            <span>·</span>
            <span>{task.name ?? 'Anônimo'}</span>
            <span>·</span>
            <span>{timeAgo(task.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} title={priorityCfg.label} />
          <span className="text-xs text-purple-300">{priorityCfg.label}</span>
        </div>
      </div>
    </div>
  )
}
