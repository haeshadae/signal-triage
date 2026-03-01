import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const store = getStore('signal-tickets')
    const { blobs } = await store.list()

    const tickets = (
      await Promise.all(
        blobs.map((b) => store.get(b.key, { type: 'json' }))
      )
    ).filter(Boolean) // drop any blobs that have been deleted since listing

    // Sort newest first so the frontend merges in chronological order
    const sorted = (tickets as Array<{ createdAt: string }>).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorted),
    }
  } catch (e) {
    console.error('[get-tickets] Failed to read from Blobs:', e)
    return { statusCode: 500, body: 'Failed to load tickets' }
  }
}
