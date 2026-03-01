import type { Priority } from '../types'

const STYLES: Record<Priority, { bg: string; color: string }> = {
  P0: { bg: '#FEE2E2', color: '#DC2626' },
  P1: { bg: '#FFEDD5', color: '#EA580C' },
  P2: { bg: '#FEF9C3', color: '#CA8A04' },
  P3: { bg: '#DBEAFE', color: '#2563EB' },
  P4: { bg: '#F3F4F6', color: '#6B7280' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { bg, color } = STYLES[priority]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        backgroundColor: bg,
        color,
        userSelect: 'none',
      }}
    >
      {priority}
    </span>
  )
}
