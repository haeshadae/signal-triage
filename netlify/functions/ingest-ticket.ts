import { randomUUID } from 'crypto'
import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// ── Types (mirror src/types.ts — kept local to avoid cross-build imports) ────

type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
type FeedbackType =
  | 'Bug'
  | 'Feature Request'
  | 'UX Confusion'
  | 'Churn Risk'
  | 'Praise'
  | 'Onboarding Issue'
  | 'Integration Issue'
type SlackChannel = 'eng-bugs' | 'product-feedback' | 'cs-alerts' | 'wins'

interface Ticket {
  id: string
  customerName: string
  email?: string
  feedback: string
  priority: Priority
  type: FeedbackType
  channel: SlackChannel
  summary: string
  status: 'pending'
  createdAt: string
  source: 'zapier'
}

// ── Blobs store ───────────────────────────────────────────────────────────────
//
// @netlify/blobs v10 reads NETLIFY_BLOBS_CONTEXT automatically in deployed
// functions. If that env var isn't present (e.g. on older deploys), it falls
// back to explicit NETLIFY_SITE_ID + NETLIFY_TOKEN.
//
// Set these in Netlify → Site configuration → Environment variables if needed:
//   NETLIFY_SITE_ID  — found in Site configuration → Site details
//   NETLIFY_TOKEN    — a Netlify personal access token (user settings → OAuth)

function getTicketStore() {
  return getStore({
    name: 'tickets',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_ACCESS_TOKEN,
  })
}

// ── Anthropic classification ──────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are a customer feedback classifier for Notion, a productivity and note-taking platform used by individuals and enterprise teams. Notion helps users organize their work, projects, wikis, databases, and docs in a flexible all-in-one workspace. You classify inbound customer feedback to route it to the right team.'

const CLASSIFICATION_PROMPT = (customerName: string, feedback: string) => `\
Classify this Notion customer feedback. Return ONLY a JSON object — no explanation, no markdown.

Customer: ${customerName}
Feedback: ${feedback}

Return exactly this shape:
{
  "priority": "P0" | "P1" | "P2" | "P3" | "P4",
  "type": "Bug" | "Feature Request" | "UX Confusion" | "Churn Risk" | "Praise" | "Onboarding Issue" | "Integration Issue",
  "channel": "eng-bugs" | "product-feedback" | "cs-alerts" | "wins",
  "summary": "<one concise sentence summarizing the feedback>"
}

Priority guide:
- P0: Critical — data loss, complete outage, or immediate churn threat
- P1: High — major bug or high-impact feature blocking real work
- P2: Medium — noticeable bug or important UX issue
- P3: Low — minor bug, general feature request, or improvement idea
- P4: Minimal — praise, compliments, or low-priority suggestion

Channel guide:
- eng-bugs: Technical bugs, crashes, data issues
- product-feedback: Feature requests, product suggestions, workflow improvements
- cs-alerts: Churn risks, angry customers, escalations needing immediate CS attention
- wins: Praise, positive NPS, success stories`

async function classify(
  customerName: string,
  feedback: string
): Promise<Pick<Ticket, 'priority' | 'type' | 'channel' | 'summary'>> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment variables')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: CLASSIFICATION_PROMPT(customerName, feedback) }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${err}`)
  }

  const data = (await response.json()) as { content: Array<{ text: string }> }
  const text = data.content[0].text

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no parseable JSON')

  return JSON.parse(match[0]) as Pick<Ticket, 'priority' | 'type' | 'channel' | 'summary'>
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Parse and validate body
  let customerName: string
  let email: string | undefined
  let feedback: string
  try {
    const body = JSON.parse(event.body ?? '') as Record<string, unknown>
    if (typeof body.customerName !== 'string' || !body.customerName.trim()) {
      throw new Error('customerName is required')
    }
    if (typeof body.feedback !== 'string' || !body.feedback.trim()) {
      throw new Error('feedback is required')
    }
    customerName = body.customerName.trim()
    feedback = body.feedback.trim()
    email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : undefined
  } catch (e) {
    return {
      statusCode: 400,
      body: e instanceof Error ? e.message : 'Request body must be JSON with { customerName, feedback, email? }',
    }
  }

  // Classify with Claude
  let classification: Pick<Ticket, 'priority' | 'type' | 'channel' | 'summary'>
  try {
    classification = await classify(customerName, feedback)
    console.log(`[ingest-ticket] Classified: ${JSON.stringify(classification)}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Classification failed'
    console.error('[ingest-ticket] Classification error:', msg)
    return { statusCode: 502, body: msg }
  }

  // Build ticket
  const ticket: Ticket = {
    id: randomUUID(),
    customerName,
    ...(email ? { email } : {}),
    feedback,
    ...classification,
    status: 'pending',
    createdAt: new Date().toISOString(),
    source: 'zapier',
  }

  // Persist to Netlify Blobs
  try {
    const store = getTicketStore()
    await store.setJSON(ticket.id, ticket)
    console.log(`[ingest-ticket] Saved ticket ${ticket.id} for "${customerName}"`)
  } catch (e) {
    // Return the real error so it's visible in the HTTP response, not just logs
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[ingest-ticket] Blobs error:', msg)
    return {
      statusCode: 500,
      body: `Failed to persist ticket: ${msg}`,
    }
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket),
  }
}
