import { useState } from 'react'
import type { Priority, SlackChannel, Ticket } from '../types'

interface Props {
  ticket: Ticket
  onSave: (ticket: Ticket) => void
  onClose: () => void
}

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3', 'P4']
const CHANNELS: { value: SlackChannel; label: string }[] = [
  { value: 'eng-bugs', label: '#eng-bugs' },
  { value: 'product-feedback', label: '#product-feedback' },
  { value: 'cs-alerts', label: '#cs-alerts' },
  { value: 'wins', label: '#wins' },
]

export function EditModal({ ticket, onSave, onClose }: Props) {
  const [priority, setPriority] = useState<Priority>(ticket.priority)
  const [channel, setChannel] = useState<SlackChannel>(ticket.channel)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '28px',
          width: '380px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.14)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Edit Ticket</h2>
        <p style={{ fontSize: '13px', color: '#9b9b97', marginBottom: '22px' }}>
          {ticket.customerName} · {ticket.type}
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            style={selectStyle}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '26px' }}>
          <label style={labelStyle}>Slack Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as SlackChannel)}
            style={selectStyle}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={() => onSave({ ...ticket, priority, channel })} style={primaryBtn}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#9b9b97',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '14px',
  border: '1px solid #e9e9e7',
  borderRadius: '7px',
  background: '#fff',
  color: '#1a1a1a',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'auto',
}

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '9px 14px',
  fontSize: '13px',
  fontWeight: 500,
  border: '1px solid #e9e9e7',
  borderRadius: '7px',
  background: '#fff',
  color: '#1a1a1a',
  cursor: 'pointer',
}

const primaryBtn: React.CSSProperties = {
  flex: 2,
  padding: '9px 14px',
  fontSize: '13px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '7px',
  background: '#1a1a1a',
  color: '#fff',
  cursor: 'pointer',
}
