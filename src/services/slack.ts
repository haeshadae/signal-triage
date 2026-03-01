import type { SlackChannel, Ticket } from '../types'

const PRIORITY_EMOJI: Record<string, string> = {
  P0: '🔴',
  P1: '🟠',
  P2: '🟡',
  P3: '🔵',
  P4: '⚪',
}

export async function sendToSlack(ticket: Ticket): Promise<void> {
  const emoji = PRIORITY_EMOJI[ticket.priority] ?? '⚪'

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} [${ticket.priority}] ${ticket.type} — ${ticket.customerName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:* ${ticket.summary}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Customer feedback:*\n>${ticket.feedback.replace(/\n/g, '\n>')}`,
        },
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Ticket \`${ticket.id.slice(0, 8)}\` · #${ticket.channel} · Routed via *Signal*`,
          },
        ],
      },
    ],
  }

  const proxyUrl = '/api/slack-proxy'
  const requestBody = { channel: ticket.channel, message }
  console.log('[slack] POST', proxyUrl, JSON.stringify(requestBody, null, 2))

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  const text = await response.text()
  console.log('[slack] response', response.status, response.url, text)

  if (!response.ok) {
    throw new Error(`Slack proxy error (${response.status}): ${text}`)
  }
  if (text !== 'ok' && !text.includes('ok')) {
    throw new Error(`Slack responded: ${text}`)
  }
}

// Re-export channel type so callers don't need a separate import
export type { SlackChannel }
