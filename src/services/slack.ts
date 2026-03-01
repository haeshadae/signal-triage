import type { SlackChannel, Ticket } from '../types'

const WEBHOOK_URLS: Record<SlackChannel, string> = {
  'eng-bugs': import.meta.env.VITE_SLACK_ENG_BUGS || '',
  'product-feedback': import.meta.env.VITE_SLACK_PRODUCT_FEEDBACK || '',
  'cs-alerts': import.meta.env.VITE_SLACK_CS_ALERTS || '',
  wins: import.meta.env.VITE_SLACK_WINS || '',
}

const PRIORITY_EMOJI: Record<string, string> = {
  P0: '🔴',
  P1: '🟠',
  P2: '🟡',
  P3: '🔵',
  P4: '⚪',
}

function getProxyPath(channel: SlackChannel): string {
  const url = WEBHOOK_URLS[channel]
  if (!url) throw new Error(`No Slack webhook configured for #${channel}. Set VITE_SLACK_${channel.toUpperCase().replace('-', '_')} in .env`)
  // Convert full webhook URL to proxy path:
  // https://hooks.slack.com/services/T.../B.../xxx -> /api/slack/services/T.../B.../xxx
  const { pathname } = new URL(url)
  return `/api/slack${pathname}`
}

export async function sendToSlack(ticket: Ticket): Promise<void> {
  const proxyPath = getProxyPath(ticket.channel)
  const emoji = PRIORITY_EMOJI[ticket.priority] ?? '⚪'

  const body = {
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

  const response = await fetch(proxyPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Slack returns plain text "ok" on success (status 200)
  const text = await response.text()
  if (!response.ok || (text !== 'ok' && !text.includes('ok'))) {
    throw new Error(`Slack responded: ${text || response.status}`)
  }
}
