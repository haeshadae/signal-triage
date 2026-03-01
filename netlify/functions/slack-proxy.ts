import type { Handler } from '@netlify/functions'

// Webhook URLs are read server-side from env vars so they are never exposed
// to the browser bundle. In Netlify's dashboard, set these as environment
// variables — the VITE_ prefix works fine here since Netlify makes all env
// vars available to functions via process.env regardless of prefix.
const WEBHOOK_URLS: Record<string, string | undefined> = {
  'eng-bugs': process.env.VITE_SLACK_ENG_BUGS,
  'product-feedback': process.env.VITE_SLACK_PRODUCT_FEEDBACK,
  'cs-alerts': process.env.VITE_SLACK_CS_ALERTS,
  wins: process.env.VITE_SLACK_WINS,
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let channel: string
  let message: unknown
  try {
    const parsed = JSON.parse(event.body ?? '') as { channel?: unknown; message?: unknown }
    if (typeof parsed.channel !== 'string' || !parsed.message) {
      throw new Error('missing fields')
    }
    channel = parsed.channel
    message = parsed.message
  } catch {
    return { statusCode: 400, body: 'Request body must be JSON with { channel, message }' }
  }

  const webhookUrl = WEBHOOK_URLS[channel]
  if (!webhookUrl) {
    return {
      statusCode: 400,
      body: `No Slack webhook configured for channel: ${channel}`,
    }
  }

  // Safety check: only forward to Slack
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { statusCode: 400, body: 'Invalid webhook URL' }
  }

  const slackResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  const text = await slackResponse.text()
  return {
    statusCode: slackResponse.status,
    body: text,
  }
}
