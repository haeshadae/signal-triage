import { useEffect, useState } from 'react'
import type { Ticket } from './types'
import { KanbanBoard } from './components/KanbanBoard'
import { NewTicketModal } from './components/NewTicketModal'
import { MonthlyReport } from './components/MonthlyReport'
import { loadTickets, saveTickets } from './utils/storage'
import { exportToCsv } from './utils/csv'

type Tab = 'board' | 'report'

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets)
  const [tab, setTab] = useState<Tab>('board')
  const [showNewTicket, setShowNewTicket] = useState(false)

  // Persist to localStorage whenever tickets change
  useEffect(() => {
    saveTickets(tickets)
  }, [tickets])

  // On mount, fetch any tickets submitted via the ingest endpoint (e.g. from Zapier)
  // and merge ones that aren't already in localStorage.
  useEffect(() => {
    fetch('/api/get-tickets')
      .then((r) => (r.ok ? (r.json() as Promise<Ticket[]>) : []))
      .then((remote) => {
        setTickets((prev) => {
          const existingIds = new Set(prev.map((t) => t.id))
          const incoming = remote.filter((t) => !existingIds.has(t.id))
          return incoming.length > 0 ? [...incoming, ...prev] : prev
        })
      })
      .catch(() => {
        // Silently ignore — function not available in local dev without netlify dev
      })
  }, [])

  const handleAdd = (ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev])
    setShowNewTicket(false)
  }

  const handleUpdate = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const handleMove = (id: string, status: Ticket['status']) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <header
        style={{
          height: '52px',
          flexShrink: 0,
          borderBottom: '1px solid #e9e9e7',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: '#fff',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#1a1a1a',
            }}
          >
            Signal
          </span>
          <span
            style={{
              fontSize: '10px',
              color: '#9b9b97',
              border: '1px solid #e9e9e7',
              borderRadius: '4px',
              padding: '1px 6px',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            for Notion
          </span>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: '2px' }}>
          {(['board', 'report'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '5px 11px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background: tab === t ? '#f0f0ee' : 'transparent',
                color: tab === t ? '#1a1a1a' : '#9b9b97',
                cursor: 'pointer',
              }}
            >
              {t === 'board' ? 'Kanban Board' : 'Monthly Report'}
            </button>
          ))}
        </nav>

        {/* Right-side actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => exportToCsv(tickets)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #e9e9e7',
              borderRadius: '6px',
              background: '#fff',
              color: '#6b6b6b',
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>

          {tab === 'board' && (
            <button
              onClick={() => setShowNewTicket(true)}
              style={{
                padding: '6px 13px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background: '#1a1a1a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              + New Ticket
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      {tab === 'board' ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
        >
          <KanbanBoard tickets={tickets} onUpdate={handleUpdate} onMove={handleMove} />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <MonthlyReport />
        </div>
      )}

      {showNewTicket && (
        <NewTicketModal onSubmit={handleAdd} onClose={() => setShowNewTicket(false)} />
      )}
    </div>
  )
}
