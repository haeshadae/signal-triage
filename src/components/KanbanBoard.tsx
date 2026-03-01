import type { Ticket } from '../types'
import { Column } from './Column'

interface Props {
  tickets: Ticket[]
  onUpdate: (ticket: Ticket) => void
  onMove: (id: string, status: Ticket['status']) => void
}

export function KanbanBoard({ tickets, onUpdate, onMove }: Props) {
  return (
    <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
      <Column
        title="Pending Review"
        status="pending"
        tickets={tickets.filter((t) => t.status === 'pending')}
        onUpdate={onUpdate}
        onMove={onMove}
      />
      <Column
        title="In Progress"
        status="in-progress"
        tickets={tickets.filter((t) => t.status === 'in-progress')}
        onUpdate={onUpdate}
        onMove={onMove}
      />
      <Column
        title="Resolved"
        status="resolved"
        tickets={tickets.filter((t) => t.status === 'resolved')}
        onUpdate={onUpdate}
        onMove={onMove}
      />
    </div>
  )
}
