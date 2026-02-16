/**
 * WebRTC Signaling Server Example
 * 
 * This is a simple Node.js WebSocket server for WebRTC signaling.
 * In production, you'd want to add authentication, room management, etc.
 * 
 * Installation:
 *   npm install ws
 * 
 * Run:
 *   node webrtc-signaling-server.js
 */

const WebSocket = require('ws');

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebRTC Signaling Server running on ws://localhost:8080');

// Store connected clients
const clients = new Map();

// Handle new connections
wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    clients.set(clientId, ws);
    
    console.log(`Client connected: ${clientId} (Total: ${clients.size})`);
    
    // Send client their ID
    ws.send(JSON.stringify({
        type: 'client-id',
        id: clientId
    }));

    // Handle messages from client
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(clientId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client disconnected: ${clientId} (Total: ${clients.size})`);
        
        // Notify other clients
        broadcast({
            type: 'peer-disconnected',
            peerId: clientId
        }, clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error(`Error for client ${clientId}:`, error);
    });
});

/**
 * Handle incoming messages
 */
function handleMessage(fromClientId, message) {
    console.log(`Message from ${fromClientId}:`, message.type);

    switch (message.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
            // Forward to target peer
            if (message.to) {
                sendToClient(message.to, {
                    ...message,
                    from: fromClientId
                });
            } else {
                // Broadcast to all other clients (for demo)
                broadcast(message, fromClientId);
            }
            break;

        case 'join-room':
            // Room management (simplified)
            console.log(`${fromClientId} joined room: ${message.roomId}`);
            // In production, implement proper room management
            break;

        case 'list-peers':
            // Send list of connected peers
            const peerIds = Array.from(clients.keys()).filter(id => id !== fromClientId);
            sendToClient(fromClientId, {
                type: 'peers-list',
                peers: peerIds
            });
            break;

        default:
            console.warn('Unknown message type:', message.type);
    }
}

/**
 * Send message to specific client
 */
function sendToClient(clientId, message) {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    } else {
        console.warn(`Client ${clientId} not found or not connected`);
    }
}

/**
 * Broadcast message to all clients except sender
 */
function broadcast(message, excludeClientId) {
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

/**
 * Generate unique client ID
 */
function generateClientId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

