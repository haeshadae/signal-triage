import type { Ticket } from '../types'
import { TicketCard } from './TicketCard'

interface Props {
  title: string
  status: Ticket['status']
  tickets: Ticket[]
  onUpdate: (ticket: Ticket) => void
  onMove: (id: string, status: Ticket['status']) => void
}

const DOT_COLOR: Record<Ticket['status'], string> = {
  pending: '#f59e0b',
  'in-progress': '#3b82f6',
  resolved: '#22c55e',
}

export function Column({ title, status, tickets, onUpdate, onMove }: Props) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#f7f7f5',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 16px 12px',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: DOT_COLOR[status],
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{title}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            fontWeight: 600,
            color: '#9b9b97',
            background: '#eaeae8',
            padding: '1px 7px',
            borderRadius: '10px',
            minWidth: '22px',
            textAlign: 'center',
          }}
        >
          {tickets.length}
        </span>
      </div>

      {/* Cards — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 12px 12px',
          minHeight: 0,
        }}
      >
        {tickets.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#c4c4c0',
              fontSize: '13px',
            }}
          >
            No tickets
          </div>
        )}
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onUpdate={onUpdate} onMove={onMove} />
        ))}
      </div>
    </div>
  )
}
