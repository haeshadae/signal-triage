import type { Ticket } from '../types'

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

export function exportToCsv(tickets: Ticket[]): void {
  const headers = [
    'ID',
    'Created At',
    'Status',
    'Priority',
    'Type',
    'Channel',
    'Customer Name',
    'Summary',
    'Feedback',
  ]

  const rows = tickets.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.createdAt),
    escapeCsv(t.status),
    escapeCsv(t.priority),
    escapeCsv(t.type),
    escapeCsv(t.channel),
    escapeCsv(t.customerName),
    escapeCsv(t.summary),
    escapeCsv(t.feedback),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `signal-tickets-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
