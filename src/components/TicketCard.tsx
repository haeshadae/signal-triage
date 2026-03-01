import { useState } from 'react'
import type { Ticket } from '../types'
import { PriorityBadge } from './PriorityBadge'
import { EditModal } from './EditModal'
import { sendToSlack } from '../services/slack'

interface Props {
  ticket: Ticket
  onUpdate: (ticket: Ticket) => void
  onMove: (id: string, status: Ticket['status']) => void
}

const CHANNEL_LABEL: Record<string, string> = {
  'eng-bugs': '#eng-bugs',
  'product-feedback': '#product-feedback',
  'cs-alerts': '#cs-alerts',
  wins: '#wins',
}

export function TicketCard({ ticket, onUpdate, onMove }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setApproving(true)
    setError(null)
    try {
      await sendToSlack(ticket)
      onMove(ticket.id, 'in-progress')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send to Slack')
    } finally {
      setApproving(false)
    }
  }

  return (
    <>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e9e9e7',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top row: priority + id */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <PriorityBadge priority={ticket.priority} />
          <span style={{ fontSize: '10px', color: '#c4c4c0', fontFamily: 'monospace' }}>
            {ticket.id.slice(0, 8)}
          </span>
        </div>

        {/* Customer name + type */}
        <div style={{ marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
            {ticket.customerName}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#9b9b97',
              marginLeft: '8px',
              fontWeight: 500,
            }}
          >
            {ticket.type}
          </span>
        </div>

        {/* AI summary */}
        <p
          style={{
            fontSize: '13px',
            color: '#3d3d3a',
            lineHeight: '1.5',
            marginBottom: '10px',
            fontWeight: 500,
          }}
        >
          {ticket.summary}
        </p>

        {/* Raw feedback */}
        <p
          style={{
            fontSize: '12px',
            color: '#6b6b6b',
            lineHeight: '1.6',
            marginBottom: '10px',
            padding: '8px 10px',
            background: '#f7f7f5',
            borderRadius: '5px',
            borderLeft: '2px solid #e2e2df',
          }}
        >
          {ticket.feedback}
        </p>

        {/* Channel tag */}
        <div style={{ marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#6b6b6b',
              background: '#f0f0ee',
              padding: '2px 7px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {CHANNEL_LABEL[ticket.channel]}
          </span>
        </div>

        {/* Error */}
        {error && (
          <p
            style={{
              fontSize: '12px',
              color: '#DC2626',
              marginBottom: '10px',
              padding: '6px 10px',
              background: '#FEF2F2',
              borderRadius: '5px',
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        {ticket.status === 'pending' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{
                flex: 1,
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid #e9e9e7',
                borderRadius: '6px',
                background: '#fff',
                color: '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{
                flex: 2,
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                background: approving ? '#9b9b97' : '#1a1a1a',
                color: '#fff',
                cursor: approving ? 'not-allowed' : 'pointer',
              }}
            >
              {approving ? 'Sending…' : 'Approve & Notify Slack'}
            </button>
          </div>
        )}

        {ticket.status === 'in-progress' && (
          <button
            onClick={() => onMove(ticket.id, 'resolved')}
            style={{
              width: '100%',
              padding: '7px 10px',
              fontSize: '12px',
              fontWeight: 500,
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              background: '#f0fdf4',
              color: '#16a34a',
              cursor: 'pointer',
            }}
          >
            Mark Resolved
          </button>
        )}
      </div>

      {showEdit && (
        <EditModal
          ticket={ticket}
          onSave={(updated) => {
            onUpdate(updated)
            setShowEdit(false)
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
