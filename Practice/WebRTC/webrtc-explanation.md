# WebRTC: Complete Guide with Examples

## What is WebRTC?

**WebRTC (Web Real-Time Communication)** is an open-source technology that enables real-time peer-to-peer communication directly between web browsers or mobile applications without requiring plugins or additional software. It allows you to build applications for voice calling, video conferencing, file sharing, and data streaming.

## Key Features

1. **Peer-to-Peer Communication**: Direct connection between browsers
2. **No Plugins Required**: Native browser support
3. **Low Latency**: Real-time communication with minimal delay
4. **Secure**: Encrypted by default (DTLS/SRTP)
5. **Cross-Platform**: Works on web, iOS, Android, and desktop

## Core Components

### 1. **MediaStream (getUserMedia)**
   - Captures audio and video from user's device
   - Access to microphone and camera

### 2. **RTCPeerConnection**
   - Manages the peer-to-peer connection
   - Handles signaling, connection, and data transfer

### 3. **RTCDataChannel**
   - Enables peer-to-peer data transfer
   - Used for file sharing, gaming, etc.

## How WebRTC Works

### The Connection Process:

1. **Media Capture**: Get access to user's media (camera/microphone)
2. **Signaling**: Exchange connection information (via a signaling server)
3. **ICE Candidates**: Exchange network information (NAT traversal)
4. **SDP Exchange**: Exchange session descriptions (codecs, capabilities)
5. **Connection Establishment**: Direct peer-to-peer connection
6. **Media/Data Transfer**: Stream audio/video or send data

### Why Signaling Server is Needed:

- WebRTC doesn't provide signaling mechanism
- Peers need to exchange connection information
- Can use WebSocket, Socket.io, or any other method
- Signaling server helps peers discover each other

## Architecture Diagram

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

## Example 1: Simple Video Chat (Two Users)

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebRTC Video Chat</title>
</head>
<body>
    <video id="localVideo" autoplay muted></video>
    <video id="remoteVideo" autoplay></video>
    <button id="startBtn">Start Call</button>
    <button id="endBtn">End Call</button>
    
    <script src="webrtc-chat.js"></script>
</body>
</html>
```

### JavaScript Implementation

```javascript
// webrtc-chat.js

// Configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
        // For production, add TURN servers for NAT traversal
    ]
};

// DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');

// Variables
let localStream = null;
let peerConnection = null;
let signalingChannel = null; // WebSocket or similar

// Initialize WebSocket for signaling (simplified - you'd use a real server)
function initSignaling() {
    // In real app, connect to your signaling server
    signalingChannel = {
        send: (data) => {
            // Send to signaling server
            console.log('Sending:', data);
            // In real app: ws.send(JSON.stringify(data));
        },
        onmessage: (event) => {
            // Handle incoming messages
            handleSignalingMessage(JSON.parse(event.data));
        }
    };
}

// Start the call
startBtn.addEventListener('click', async () => {
    try {
        // 1. Get user media (camera and microphone)
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        localVideo.srcObject = localStream;
        
        // 2. Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // 3. Add local stream tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // 4. Handle remote stream
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };
        
        // 5. Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.send({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };
        
        // 6. Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        signalingChannel.send({
            type: 'offer',
            offer: offer
        });
        
    } catch (error) {
        console.error('Error starting call:', error);
    }
});

// Handle signaling messages
function handleSignalingMessage(message) {
    switch (message.type) {
        case 'offer':
            handleOffer(message.offer);
            break;
        case 'answer':
            handleAnswer(message.answer);
            break;
        case 'ice-candidate':
            handleIceCandidate(message.candidate);
            break;
    }
}

// Handle incoming offer
async function handleOffer(offer) {
    try {
        // 1. Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        localVideo.srcObject = localStream;
        
        // 2. Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // 3. Add local stream
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // 4. Handle remote stream
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };
        
        // 5. Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.send({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };
        
        // 6. Set remote description and create answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        signalingChannel.send({
            type: 'answer',
            answer: answer
        });
        
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

// Handle incoming answer
async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

// Handle ICE candidate
async function handleIceCandidate(candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// End the call
endBtn.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
});

// Initialize
initSignaling();
```

## Example 2: Data Channel (File Sharing)

```javascript
// webrtc-data-channel.js

let peerConnection = null;
let dataChannel = null;

// Create data channel for file sharing
async function createDataChannel() {
    peerConnection = new RTCPeerConnection(configuration);
    
    // Create data channel
    dataChannel = peerConnection.createDataChannel('fileTransfer', {
        ordered: true // Ensure messages arrive in order
    });
    
    // Handle data channel events
    dataChannel.onopen = () => {
        console.log('Data channel opened');
    };
    
    dataChannel.onmessage = (event) => {
        console.log('Received:', event.data);
        // Handle received data
    };
    
    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
    };
    
    dataChannel.onclose = () => {
        console.log('Data channel closed');
    };
    
    // Handle incoming data channel
    peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        
        channel.onmessage = (event) => {
            // Handle received file/data
            handleReceivedData(event.data);
        };
        
        channel.onopen = () => {
            console.log('Remote data channel opened');
        };
    };
}

// Send file through data channel
function sendFile(file) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const buffer = event.target.result;
        const chunkSize = 16384; // 16KB chunks
        
        // Send file metadata first
        dataChannel.send(JSON.stringify({
            type: 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type
        }));
        
        // Send file in chunks
        let offset = 0;
        const sendChunk = () => {
            if (offset < buffer.byteLength) {
                const chunk = buffer.slice(offset, offset + chunkSize);
                dataChannel.send(chunk);
                offset += chunkSize;
                setTimeout(sendChunk, 0); // Non-blocking
            }
        };
        
        sendChunk();
    };
    
    reader.readAsArrayBuffer(file);
}

// Handle received data
function handleReceivedData(data) {
    if (typeof data === 'string') {
        const metadata = JSON.parse(data);
        if (metadata.type === 'file') {
            // Initialize file reception
            console.log('Receiving file:', metadata.name);
        }
    } else {
        // Handle binary data (file chunks)
        // Reconstruct file from chunks
    }
}
```

## Example 3: Screen Sharing

```javascript
// webrtc-screen-share.js

async function shareScreen() {
    try {
        // Request screen share instead of camera
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always', // Show cursor
                displaySurface: 'monitor' // Share entire screen
            },
            audio: true // Include system audio if supported
        });
        
        // Add screen stream to peer connection
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
        
        // Handle when user stops sharing
        stream.getVideoTracks()[0].onended = () => {
            console.log('Screen sharing ended');
        };
        
    } catch (error) {
        console.error('Error sharing screen:', error);
    }
}
```

## Key Concepts Explained

### 1. **SDP (Session Description Protocol)**
   - Describes the media capabilities (codecs, formats)
   - Exchanged between peers during signaling
   - Contains offer/answer for negotiation

### 2. **ICE (Interactive Connectivity Establishment)**
   - Finds the best path between peers
   - Handles NAT traversal
   - Uses STUN/TURN servers

### 3. **STUN Server**
   - Discovers public IP address
   - Helps with NAT traversal
   - Free public servers available (Google, etc.)

### 4. **TURN Server**
   - Relays traffic when direct connection fails
   - Required for some network configurations
   - Requires your own server (costs money)

### 5. **Signaling**
   - Not part of WebRTC specification
   - Can use WebSocket, Socket.io, HTTP, etc.
   - Exchanges SDP and ICE candidates

## Common Use Cases

1. **Video Conferencing**: Zoom, Google Meet alternatives
2. **Voice Calling**: WhatsApp Web, Discord
3. **Screen Sharing**: Remote presentations
4. **File Sharing**: Peer-to-peer file transfer
5. **Gaming**: Real-time multiplayer games
6. **Live Streaming**: Broadcasting to multiple viewers
7. **Remote Desktop**: Remote access applications

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Supported (iOS 11+, macOS 11+)
- **Opera**: Full support

## Security Considerations

1. **HTTPS Required**: getUserMedia requires secure context
2. **Permissions**: Users must grant camera/microphone access
3. **Encryption**: DTLS/SRTP encryption by default
4. **TURN Server Security**: Protect your TURN server credentials

## Best Practices

1. **Error Handling**: Always handle getUserMedia errors
2. **Cleanup**: Stop tracks when done to free resources
3. **TURN Servers**: Use TURN for production apps
4. **Bandwidth Management**: Adjust quality based on network
5. **Reconnection**: Implement reconnection logic
6. **Signaling Security**: Use WSS (secure WebSocket)

## Complete Working Example Structure

```
webrtc-app/
├── index.html
├── client.js          # WebRTC client logic
├── signaling-server.js # Node.js signaling server
└── package.json
```

## Quick Start Checklist

1. ✅ Get user media (getUserMedia)
2. ✅ Create RTCPeerConnection
3. ✅ Add tracks to connection
4. ✅ Create offer/answer
5. ✅ Exchange SDP via signaling
6. ✅ Exchange ICE candidates
7. ✅ Handle connection state
8. ✅ Clean up resources

## Resources

- **MDN WebRTC Docs**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **WebRTC Samples**: https://webrtc.github.io/samples/
- **STUN/TURN Servers**: 
  - Public STUN: `stun:stun.l.google.com:19302`
  - TURN: Use services like Twilio, Xirsys, or self-hosted

---

**Note**: This is a comprehensive overview. For production applications, you'll need a proper signaling server and TURN server infrastructure.

