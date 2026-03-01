import type { Handler } from '@netlify/functions'

// Env var names keyed by channel
const ENV_VAR: Record<string, string> = {
  'eng-bugs': 'VITE_SLACK_ENG_BUGS',
  'product-feedback': 'VITE_SLACK_PRODUCT_FEEDBACK',
  'cs-alerts': 'VITE_SLACK_CS_ALERTS',
  wins: 'VITE_SLACK_WINS',
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

  // Read env var inside the handler so it is always resolved at runtime,
  // not statically inlined as undefined by esbuild at bundle time.
  const envVarName = ENV_VAR[channel]
  if (!envVarName) {
    console.error(`[slack-proxy] Unknown channel: ${channel}`)
    return { statusCode: 400, body: `Unknown channel: ${channel}` }
  }

  const webhookUrl = process.env[envVarName]
  console.log(`[slack-proxy] channel=${channel} envVar=${envVarName} webhookUrl=${webhookUrl}`)

  if (!webhookUrl) {
    console.error(`[slack-proxy] ${envVarName} is not set in environment`)
    return { statusCode: 500, body: `${envVarName} is not set` }
  }

  // Guard against the double-domain malformation:
  // "https://hooks.slack.com/services/https://hooks.slack.com/services/..."
  if (!webhookUrl.startsWith('https://hooks.slack.com/services/T')) {
    console.error(`[slack-proxy] Malformed webhook URL: ${webhookUrl}`)
    return {
      statusCode: 500,
      body: `${envVarName} is malformed. Expected https://hooks.slack.com/services/T.../B.../... but got: ${webhookUrl}`,
    }
  }

  console.log(`[slack-proxy] POSTing to Slack webhook for #${channel}`)

  const slackResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  const text = await slackResponse.text()
  console.log(`[slack-proxy] Slack responded: status=${slackResponse.status} body=${text}`)

  return {
    statusCode: slackResponse.status,
    body: text,
  }
}
