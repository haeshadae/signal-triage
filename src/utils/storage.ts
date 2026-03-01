import type { Ticket } from '../types'

const KEY = 'signal-tickets'

export function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Ticket[]) : []
  } catch {
    return []
  }
}

export function saveTickets(tickets: Ticket[]): void {
  localStorage.setItem(KEY, JSON.stringify(tickets))
}
