# WebRTC Complete Guide & Examples

This directory contains comprehensive WebRTC examples and documentation.

## Files Overview

### 📚 Documentation
- **`webrtc-explanation.md`** - Complete guide explaining WebRTC concepts, architecture, and examples

### 💻 Examples
- **`webrtc-example.html`** - Standalone HTML demo showing local video capture (no server needed)
- **`webrtc-complete-example.js`** - Full-featured WebRTC manager class with all features
- **`webrtc-signaling-server.js`** - Node.js WebSocket signaling server
- **`webrtc-client-example.html`** - Client that connects to signaling server for peer-to-peer communication

## Quick Start

### Option 1: Simple Demo (No Server)
1. Open `webrtc-example.html` in a browser
2. Click "Start Camera" to test local video capture
3. No server setup required - this is just for testing media access

### Option 2: Full Peer-to-Peer (With Signaling Server)

1. **Navigate to WebRTC folder:**
   ```bash
   cd WebRTC
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the signaling server:**
   ```bash
   node webrtc-signaling-server.js
   ```
   Server will run on `ws://localhost:8080`

3. **Open client in browser:**
   - Open `webrtc-client-example.html` in two different browser windows/tabs
   - Or share the file with a friend and both connect to the same server

4. **Connect:**
   - Click "Connect to Server" in both clients
   - Click "Start Media" in both clients
   - Click "Start Call" in one client (this will initiate the connection)
   - The other client will automatically receive and answer

## What is WebRTC?

**WebRTC (Web Real-Time Communication)** enables:
- ✅ Real-time video/audio communication
- ✅ Peer-to-peer data transfer
- ✅ Screen sharing
- ✅ File sharing
- ✅ Low latency communication

## Key Concepts

### 1. **MediaStream (getUserMedia)**
Captures audio/video from user's device:
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
});
```

### 2. **RTCPeerConnection**
Manages the peer-to-peer connection:
```javascript
const pc = new RTCPeerConnection(config);
```

### 3. **Signaling**
Exchange connection information (requires a server):
- Offer/Answer (SDP)
- ICE candidates
- Can use WebSocket, Socket.io, or any method

### 4. **ICE (Interactive Connectivity Establishment)**
Finds the best network path between peers:
- Uses STUN servers (discover public IP)
- Uses TURN servers (relay when direct connection fails)

## Architecture Flow

```
Browser A                    Signaling Server                    Browser B
   |                              |                                 |
   |---(1) Offer SDP------------->|                                 |
   |                              |---(2) Forward Offer------------>|
   |                              |                                 |
   |                              |<---(3) Answer SDP--------------|
   |<--(4) Forward Answer---------|                                 |
   |                              |                                 |
   |---(5) ICE Candidate---------->|                                 |
   |                              |---(6) Forward ICE------------->|
   |                              |                                 |
   |                              |<---(7) ICE Candidate------------|
   |<--(8) Forward ICE------------|                                 |
   |                              |                                 |
   |<========== Direct P2P Connection ============================>|
```

## Features Demonstrated

### ✅ Media Capture
- Camera and microphone access
- Screen sharing
- Video track replacement

### ✅ Peer Connection
- Offer/Answer negotiation
- ICE candidate exchange
- Connection state management

### ✅ Data Channel
- Peer-to-peer data transfer
- File sharing capability
- Chat messaging

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Supported (iOS 11+, macOS 11+)
- ✅ Opera: Full support

## Security Notes

1. **HTTPS Required**: `getUserMedia` requires secure context (HTTPS or localhost)
2. **Permissions**: Users must grant camera/microphone access
3. **Encryption**: DTLS/SRTP encryption by default
4. **TURN Servers**: Protect credentials in production

## Production Considerations

### 1. **TURN Servers**
For production, you need TURN servers for NAT traversal:
- Services: Twilio, Xirsys, Metered.ca
- Or self-hosted: coturn, rfc5766-turn-server

### 2. **Signaling Server**
- Add authentication
- Room management
- User presence
- Error handling and reconnection

### 3. **Scalability**
- For many-to-many: Use SFU (Selective Forwarding Unit)
- For broadcasting: Use MCU (Multipoint Control Unit)

## Common Use Cases

1. **Video Conferencing**: Zoom, Google Meet alternatives
2. **Voice Calling**: WhatsApp Web, Discord
3. **Screen Sharing**: Remote presentations
4. **File Sharing**: Peer-to-peer transfer
5. **Gaming**: Real-time multiplayer
6. **Live Streaming**: Broadcasting
7. **Remote Desktop**: Remote access

## Troubleshooting

### Camera/Microphone not working?
- Check browser permissions
- Ensure HTTPS (or localhost)
- Check if device is in use by another app

### Connection not establishing?
- Check STUN/TURN server configuration
- Verify signaling server is running
- Check firewall/NAT settings
- May need TURN server for some networks

### No remote video?
- Ensure both peers are connected
- Check connection state in logs
- Verify ICE candidates are being exchanged

## Resources

- **MDN WebRTC Docs**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **WebRTC Samples**: https://webrtc.github.io/samples/
- **STUN Server**: `stun:stun.l.google.com:19302` (free)
- **TURN Services**: Twilio, Xirsys, Metered.ca

## Next Steps

1. Read `webrtc-explanation.md` for detailed concepts
2. Try `webrtc-example.html` for simple demo
3. Set up signaling server for peer-to-peer
4. Explore `webrtc-complete-example.js` for advanced features
5. Build your own WebRTC application!

---

**Happy Coding! 🚀**

