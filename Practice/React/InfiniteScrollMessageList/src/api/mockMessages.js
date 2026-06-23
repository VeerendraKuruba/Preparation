const TOTAL_MESSAGES = 80;
const SENDERS = ['Alice', 'Bob', 'You'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates cursor-based pagination (not offset).
 * cursor = index of the next message to fetch.
 */
export async function fetchMessages({ cursor = null, limit = 20, signal } = {}) {
  await delay(400);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const start = cursor ? Number(cursor) : 0;
  const end = Math.min(start + limit, TOTAL_MESSAGES);

  const messages = Array.from({ length: end - start }, (_, i) => {
    const index = start + i;
    const id = index + 1;
    return {
      id: String(id),
      sender: SENDERS[index % SENDERS.length],
      body: `Message #${id} — scroll down to load more.`,
      timestamp: new Date(Date.now() - (TOTAL_MESSAGES - id) * 60_000).toISOString(),
    };
  });

  const nextCursor = end < TOTAL_MESSAGES ? String(end) : null;
  return { messages, nextCursor };
}
