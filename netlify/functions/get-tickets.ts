import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

function getTicketStore() {
  return getStore({
    name: 'tickets',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_ACCESS_TOKEN,
  })
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const store = getTicketStore()
    const { blobs } = await store.list()

    const tickets = (
      await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))
    ).filter(Boolean)

    const sorted = (tickets as Array<{ createdAt: string }>).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorted),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[get-tickets] Blobs error:', msg)
    return {
      statusCode: 500,
      body: `Failed to load tickets: ${msg}`,
    }
  }
}
