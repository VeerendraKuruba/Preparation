const express = require('express');
const app = express();
app.use(express.json());//request body shuld be in json format

const PORT = 3000;
const messages = [];

// ─────────────────────────────────────────────
// REQUIREMENT 1: Send a Message
// ─────────────────────────────────────────────
// POST /messages
// Body: { from: string, to: string, content: string }
//
// - Validate that from, to, and content are present → 400 if missing
// - Simulate a delivery delay of 2000ms
// - If delivery takes more than 5000ms → respond with 408 timeout
// - On success → store the message and return 201 with message object
// - On server error → return 500
//
// Hint: Use Promise.race() to race delay vs timeout
// Hint: setTimeout takes MILLISECONDS (not seconds!)
// ─────────────────────────────────────────────

const delay = (ms)=>new Promise(resolve=>setTimeout(resolve,ms)) 

app.post('/messages', async (req, res) => {
  // YOUR CODE HERE
  const {from, to, content} = req.body;
  if(!from || !to || !content){
    return res.status(400).json({error: 'missing field data'})
  }
  const DELAY_MS = 2000;
  const TIMEOUT_DELAY = 5000;

  const delayTimeout = new Promise((_,reject)=>{
    setTimeout((()=>reject(new Error('timeout'))),TIMEOUT_DELAY)
  })

  try{

    await Promise.race([delay(DELAY_MS), delayTimeout]);

    const message = {
      from: from,
      to: to,
      content:content,
      id: Date.now(),
      status: 'delivered',
      read: false,
      timestamp: new Date().toISOString()
    }

    messages.push(message);
    return res.status(201).json(message)

  } catch(error) {
    if(error.messgae === 'timeout'){
      return res.status(408).json({error:'bad request'})
    }
    return res.status(500).json({error: 'network timeout'})
  }

});


// ─────────────────────────────────────────────
// REQUIREMENT 2: Get Messages for a User
// ─────────────────────────────────────────────
// GET /messages?userId=<string>
//
// - userId query param is required → 400 if missing
// - Filter messages where from === userId OR to === userId
// - If no messages found → 404
// - On success → return 200 with array of messages
// ─────────────────────────────────────────────

app.get('/messages', (req, res) => {
  // YOUR CODE HERE
  const {userId} = req.query;
  if(!userId) {
    return res.status(400).json({error: 'userId param is required'})
  }
  const userMessages = messages.filter(message=>{
    return message.from === userId || message.to === userId
  })
  if(userMessages.length === 0){
    return res.status(404).json({error: 'no messages found'})
  }
  return res.status(200).json(userMessages)
});


// ─────────────────────────────────────────────
// REQUIREMENT 3: Mark a Message as Read
// ─────────────────────────────────────────────
// PATCH /messages/:id/read
//
// - Find message by id
// - If not found → 404
// - Set message.read = true
// - Return 200 with updated message
// ─────────────────────────────────────────────

app.patch('/messages/:id/read', (req, res) => {
  // YOUR CODE HERE
  const id = Number(req.params.id);

  const message = messages.find(m=>(m.id) === id)
  if(!message){
    return res.status(404).json({error : 'messgae not found'})
  }
  message.read = true;
  return res.status(200).json(message)
});


// ─────────────────────────────────────────────
// REQUIREMENT 4: Delete a Message
// ─────────────────────────────────────────────
// DELETE /messages/:id
//
// - Find message by id
// - If not found → 404
// - Remove it from the storeßß
// - Return 204 (no body)
// ─────────────────────────────────────────────

app.delete('/messages/:id', (req, res) => {
  // YOUR CODE HERE
  const id = Number(req.params.id);
  const messageIndex = messages.findIndex(m=>(m.id) === id)
  if(messageIndex === -1){
    return res.status(404).json({error : 'messgae not found'})
  }
  messages.splice(messageIndex,1)
  return res.status(204).send()
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Run: node test-runner.js to check your implementation');
});
