// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS EXPRESS?
// Express is a Node.js framework that makes it easy to create HTTP servers.
// Without it, you'd have to use Node's built-in `http` module which is verbose.
//
// WHAT IS AN HTTP SERVER?
// A server listens for incoming requests (GET, POST, etc.) and sends back responses.
// Think of it like a waiter: customer (client) makes a request → waiter (server) responds.
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express');
const mongoose = require('mongoose');
const app      = express();

// MIDDLEWARE: express.json() tells Express to automatically parse
// incoming request bodies that are JSON format.
// Without this, req.body would be undefined.
app.use(express.json());

const PORT = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB CONNECTION
//
// mongoose.connect() opens a connection to MongoDB running locally.
// The database "ebay-messages" is created automatically if it doesn't exist.
//
// mongoose is an ODM (Object Document Mapper) — it lets you define a Schema
// so your documents have consistent shape, even though MongoDB doesn't require it.
// ─────────────────────────────────────────────────────────────────────────────
mongoose.connect('mongodb://localhost:27017/ebay-messages')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA + MODEL
//
// Schema  = blueprint that defines the shape of a document
// Model   = class that lets you create/read/update/delete documents
//
// MongoDB auto-generates _id (ObjectId) for each document.
// We expose it as `id` in responses for consistency with the API contract.
// ─────────────────────────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  from:      { type: String, required: true },
  to:        { type: String, required: true },
  content:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  status:    { type: String, default: 'delivered' },
  timestamp: { type: String },
});

const Message = mongoose.model('Message', MessageSchema);


// ─────────────────────────────────────────────────────────────────────────────
// HELPER: delay(ms)
//
// What is a Promise?
//   A Promise represents a value that will be available in the future.
//   It can be in 3 states: pending → fulfilled (resolve) OR rejected (reject)
//
// What is async/await?
//   `await` pauses execution until a Promise resolves.
//   You can only use `await` inside an `async` function.
//
// Why wrap setTimeout in a Promise?
//   setTimeout is callback-based (old style). We wrap it so we can use
//   modern async/await syntax instead of nested callbacks.
//
// IMPORTANT: setTimeout takes MILLISECONDS
//   setTimeout(fn, 2000) → waits 2 SECONDS  ✔
//   setTimeout(fn, 2)    → waits 2 MS        ✘ (common interview bug!)
// ─────────────────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT 1: Send a Message
//
// Endpoint : POST /messages
// Request  : { "from": "buyer1", "to": "seller1", "content": "Is it available?" }
// Response : 201 { id, from, to, content, read, status, timestamp }
//
// Rules:
//   - All 3 fields are required → return 400 if any is missing
//   - Simulate network delivery delay of 2 seconds
//   - If delivery takes more than 5 seconds → return 408 (timeout)
//   - On success → return 201 with the saved message object
// ─────────────────────────────────────────────────────────────────────────────

app.post('/messages', async (req, res) => {

  const { from, to, content } = req.body;

  // VALIDATION: check all required fields exist and are not empty strings
  if (!from || !to || !content) {
    return res.status(400).json({ error: 'Missing required fields: from, to, content' });
  }

  const DELIVERY_DELAY_MS = 2000;
  const TIMEOUT_MS        = 5000;

  // TIMEOUT PROMISE: rejects after TIMEOUT_MS
  const deliveryTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  );

  try {
    // Promise.race([a, b]) → resolves/rejects with WHICHEVER Promise finishes first
    await Promise.race([
      delay(DELIVERY_DELAY_MS),
      deliveryTimeout,
    ]);

    // Message.create() inserts a new document into the MongoDB "messages" collection.
    // It returns the saved document including the auto-generated _id.
    const saved = await Message.create({
      from,
      to,
      content,
      read:      false,
      status:    'delivered',
      timestamp: new Date().toISOString(),
    });

    // Return a plain object with `id` instead of MongoDB's `_id`
    return res.status(201).json({
      id:        saved._id,
      from:      saved.from,
      to:        saved.to,
      content:   saved.content,
      read:      saved.read,
      status:    saved.status,
      timestamp: saved.timestamp,
    });

  } catch (err) {
    if (err.message === 'timeout') {
      return res.status(408).json({ error: 'Message delivery timed out' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT 2: Get Messages for a User
//
// Endpoint : GET /messages?userId=buyer1
// Response : 200 [ ...messages ]
//
// Rules:
//   - userId query param is required → 400 if missing
//   - Return messages where user is either sender OR receiver
//   - If no messages found → 404
// ─────────────────────────────────────────────────────────────────────────────

app.get('/messages', async (req, res) => {

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query param is required' });
  }

  // $or is a MongoDB query operator — matches documents where at least one condition is true
  // This replaces the Array.filter() we used with the in-memory store
  const docs = await Message.find({
    $or: [{ from: userId }, { to: userId }],
  });

  if (docs.length === 0) {
    return res.status(404).json({ error: 'No messages found for this user' });
  }

  // Map _id → id for each document in the response
  const userMessages = docs.map((m) => ({
    id:        m._id,
    from:      m.from,
    to:        m.to,
    content:   m.content,
    read:      m.read,
    status:    m.status,
    timestamp: m.timestamp,
  }));

  return res.status(200).json(userMessages);
});


// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT 3: Mark a Message as Read
//
// Endpoint : PATCH /messages/:id/read
// Response : 200 { ...updatedMessage }
//
// Rules:
//   - :id is a URL param (dynamic segment), e.g. /messages/<mongoId>/read
//   - If message not found → 404
//   - Set message.read = true and return the updated message
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/messages/:id/read', async (req, res) => {

  const { id } = req.params;

  // findByIdAndUpdate(id, update, options)
  // { new: true } → return the UPDATED document instead of the old one
  const updated = await Message.findByIdAndUpdate(
    id,
    { read: true },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: 'Message not found' });
  }

  return res.status(200).json({
    id:        updated._id,
    from:      updated.from,
    to:        updated.to,
    content:   updated.content,
    read:      updated.read,
    status:    updated.status,
    timestamp: updated.timestamp,
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// REQUIREMENT 4: Delete a Message
//
// Endpoint : DELETE /messages/:id
// Response : 204 (no body)
//
// Rules:
//   - If message not found → 404
//   - Remove it from the store
//   - Return 204 (no content — DELETE responses have no body)
// ─────────────────────────────────────────────────────────────────────────────

app.delete('/messages/:id', async (req, res) => {

  const { id } = req.params;

  // findByIdAndDelete returns the deleted document, or null if not found
  const deleted = await Message.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({ error: 'Message not found' });
  }

  return res.status(204).send();
});


// ─────────────────────────────────────────────────────────────────────────────
// START THE SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Solution server running on http://localhost:${PORT}`);
  console.log('Run: node test-runner.js to validate');
});
