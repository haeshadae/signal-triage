import type { Ticket, Priority, FeedbackType, SlackChannel, MonthlyReportData } from '../types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const NOTION_SYSTEM_PROMPT = `You are a customer feedback classifier for Notion, a productivity and note-taking platform used by individuals and enterprise teams. Notion helps users organize their work, projects, wikis, databases, and docs in a flexible all-in-one workspace. You classify inbound customer feedback to route it to the right team.`

async function callClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  system: string,
  maxTokens = 1024
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

function extractJSON(text: string): unknown {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude returned no parseable JSON')
  return JSON.parse(match[0])
}

export async function classifyFeedback(
  customerName: string,
  feedback: string
): Promise<Omit<Ticket, 'id' | 'customerName' | 'feedback' | 'status' | 'createdAt'>> {
  const text = await callClaude(
    [
      {
        role: 'user',
        content: `Classify this Notion customer feedback. Return ONLY a JSON object — no explanation, no markdown.

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
- wins: Praise, positive NPS, success stories`,
      },
    ],
    NOTION_SYSTEM_PROMPT
  )

  const result = extractJSON(text) as {
    priority: Priority
    type: FeedbackType
    channel: SlackChannel
    summary: string
  }

  return result
}

export async function analyzeCSV(csvContent: string): Promise<MonthlyReportData> {
  const text = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze this customer feedback CSV data for Notion. Return ONLY a JSON object — no explanation, no markdown.

CSV Data:
${csvContent}

Return exactly this shape:
{
  "executiveSummary": "<2–3 sentence executive summary of the month's feedback>",
  "priorityBreakdown": {
    "P0": <integer count>,
    "P1": <integer count>,
    "P2": <integer count>,
    "P3": <integer count>,
    "P4": <integer count>
  },
  "topThemes": [
    "<theme 1>",
    "<theme 2>",
    "<theme 3>",
    "<theme 4>",
    "<theme 5>"
  ],
  "churnRisks": [
    "<at-risk customer or issue 1>",
    "<at-risk customer or issue 2>",
    "<at-risk customer or issue 3>"
  ],
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>",
    "<recommendation 4>"
  ]
}

Use the full CSV content to infer priority levels even if no priority column is present. Be specific and actionable.`,
      },
    ],
    NOTION_SYSTEM_PROMPT,
    2048
  )

  return extractJSON(text) as MonthlyReportData
}
