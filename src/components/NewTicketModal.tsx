import { useState } from 'react'
import type { Ticket } from '../types'
import { classifyFeedback } from '../services/anthropic'

interface Props {
  onSubmit: (ticket: Ticket) => void
  onClose: () => void
}

export function NewTicketModal({ onSubmit, onClose }: Props) {
  const [customerName, setCustomerName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !feedback.trim()) return

    setLoading(true)
    setError(null)

    try {
      const classification = await classifyFeedback(customerName.trim(), feedback.trim())
      const ticket: Ticket = {
        id: crypto.randomUUID(),
        customerName: customerName.trim(),
        feedback: feedback.trim(),
        ...classification,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      onSubmit(ticket)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Classification failed. Check your Anthropic API key.')
    } finally {
      setLoading(false)
    }
  }

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
          padding: '32px',
          width: '540px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
        }}
      >
        <div style={{ marginBottom: '26px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '5px' }}>
            New Feedback Ticket
          </h2>
          <p style={{ fontSize: '13px', color: '#9b9b97', lineHeight: '1.5' }}>
            Claude will classify priority, type, and route it to the right Slack channel.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={labelStyle}>Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Paste or type the customer's feedback here…"
              required
              disabled={loading}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6', fontFamily: 'inherit' }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '7px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#DC2626',
                lineHeight: '1.5',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={secondaryBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !customerName.trim() || !feedback.trim()}
              style={{
                ...primaryBtn,
                background: loading ? '#9b9b97' : '#1a1a1a',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: !customerName.trim() || !feedback.trim() ? 0.5 : 1,
              }}
            >
              {loading ? '✦  Classifying with Claude…' : 'Classify & Create Ticket'}
            </button>
          </div>
        </form>
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
  marginBottom: '7px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid #e9e9e7',
  borderRadius: '7px',
  background: '#fff',
  color: '#1a1a1a',
  outline: 'none',
}

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px 14px',
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
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '7px',
  background: '#1a1a1a',
  color: '#fff',
  cursor: 'pointer',
}
