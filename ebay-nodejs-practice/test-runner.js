/**
 * Test Runner for eBay Messaging API Practice
 * Run: node test-runner.js
 * Make sure your server is running on port 3000 first.
 */

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;
let createdMessageId = null;

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s) => `\x1b[2m${s}\x1b[0m`;

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch {}

  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(green(`  ✔ ${name}`));
    passed++;
  } catch (err) {
    console.log(red(`  ✘ ${name}`));
    console.log(dim(`    → ${err.message}`));
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ─────────────────────────────────────────────────────────
console.log(bold('\n📬 REQUIREMENT 1 — POST /messages\n'));
// ─────────────────────────────────────────────────────────

async function runReq1() {
  await test('Returns 400 when "from" is missing', async () => {
    const { status } = await request('POST', '/messages', { to: 'seller1', content: 'Hello' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Returns 400 when "to" is missing', async () => {
    const { status } = await request('POST', '/messages', { from: 'buyer1', content: 'Hello' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Returns 400 when "content" is missing', async () => {
    const { status } = await request('POST', '/messages', { from: 'buyer1', to: 'seller1' });
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Returns 201 with message object on success (waits for delivery delay)', async () => {
    const { status, data } = await request('POST', '/messages', {
      from: 'buyer1',
      to: 'seller1',
      content: 'Is this item still available?',
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.id, 'Response missing id');
    assert(data.from === 'buyer1', 'Response missing correct from');
    assert(data.to === 'seller1', 'Response missing correct to');
    assert(data.status === 'delivered', 'Response status should be delivered');
    assert(data.timestamp, 'Response missing timestamp');
    createdMessageId = data.id;
  });

  await test('Stored message has read: false by default', async () => {
    const { data } = await request('GET', `/messages?userId=buyer1`);
    const msg = data.find(m => m.id === createdMessageId);
    assert(msg, 'Message not found in store');
    assert(msg.read === false, `Expected read: false, got ${msg.read}`);
  });
}

// ─────────────────────────────────────────────────────────
console.log(bold('\n📥 REQUIREMENT 2 — GET /messages\n'));
// ─────────────────────────────────────────────────────────

async function runReq2() {
  await test('Returns 400 when userId param is missing', async () => {
    const { status } = await request('GET', '/messages');
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Returns 404 when user has no messages', async () => {
    const { status } = await request('GET', '/messages?userId=ghost_user');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('Returns 200 with messages for sender', async () => {
    const { status, data } = await request('GET', '/messages?userId=buyer1');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Response should be an array');
    assert(data.length > 0, 'Should return at least 1 message');
  });

  await test('Returns 200 with messages for receiver', async () => {
    const { status, data } = await request('GET', '/messages?userId=seller1');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.length > 0, 'seller1 should see messages sent to them');
  });
}

// ─────────────────────────────────────────────────────────
console.log(bold('\n✅ REQUIREMENT 3 — PATCH /messages/:id/read\n'));
// ─────────────────────────────────────────────────────────

async function runReq3() {
  await test('Returns 404 for non-existent message id', async () => {
    const { status } = await request('PATCH', '/messages/99999999/read');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('Returns 200 and sets read: true', async () => {
    const { status, data } = await request('PATCH', `/messages/${createdMessageId}/read`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.read === true, `Expected read: true, got ${data.read}`);
  });
}

// ─────────────────────────────────────────────────────────
console.log(bold('\n🗑️  REQUIREMENT 4 — DELETE /messages/:id\n'));
// ─────────────────────────────────────────────────────────

async function runReq4() {
  await test('Returns 404 for non-existent message id', async () => {
    const { status } = await request('DELETE', '/messages/99999999');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('Returns 204 on successful delete', async () => {
    const { status } = await request('DELETE', `/messages/${createdMessageId}`);
    assert(status === 204, `Expected 204, got ${status}`);
  });

  await test('Deleted message no longer exists', async () => {
    const { status } = await request('GET', `/messages?userId=buyer1`);
    // Either 404 (no more messages) or 200 without the deleted message
    if (status === 200) {
      const { data } = await request('GET', `/messages?userId=buyer1`);
      const stillExists = data && data.find(m => m.id === createdMessageId);
      assert(!stillExists, 'Deleted message should not be returned');
    }
    // 404 is also valid if it was the only message
  });
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(bold('\n🚀 eBay Messaging API — Test Runner'));
  console.log(dim('Make sure your server is running: npm start\n'));

  try {
    await fetch(`${BASE_URL}/messages`);
  } catch {
    console.log(red('\n✘ Cannot connect to server on port 3000.'));
    console.log('Run: npm start  (in another terminal)\n');
    process.exit(1);
  }

  // NOTE: Req1 must run first (creates the message other tests use)
  await runReq1();
  await runReq2();
  await runReq3();
  await runReq4();

  console.log('\n' + '─'.repeat(40));
  console.log(bold(`Results: ${green(passed + ' passed')}  ${failed > 0 ? red(failed + ' failed') : dim('0 failed')}`));
  console.log('─'.repeat(40) + '\n');

  if (failed === 0) {
    console.log(green('All tests pass! You are ready for the interview.\n'));
  } else {
    console.log(red(`Fix the ${failed} failing test(s) above and run again.\n`));
  }
}

main().catch(console.error);
