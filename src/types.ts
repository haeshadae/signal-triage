export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export type FeedbackType =
  | 'Bug'
  | 'Feature Request'
  | 'UX Confusion'
  | 'Churn Risk'
  | 'Praise'
  | 'Onboarding Issue'
  | 'Integration Issue'

export type SlackChannel = 'eng-bugs' | 'product-feedback' | 'cs-alerts' | 'wins'

export type TicketStatus = 'pending' | 'in-progress' | 'resolved'

export interface Ticket {
  id: string
  customerName: string
  feedback: string
  priority: Priority
  type: FeedbackType
  channel: SlackChannel
  summary: string
  status: TicketStatus
  createdAt: string
}

export interface MonthlyReportData {
  executiveSummary: string
  priorityBreakdown: {
    P0: number
    P1: number
    P2: number
    P3: number
    P4: number
  }
  topThemes: string[]
  churnRisks: string[]
  recommendations: string[]
}
