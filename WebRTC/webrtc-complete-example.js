/**
 * Complete WebRTC Implementation Example
 * This demonstrates a full WebRTC setup with signaling simulation
 */

// ============================================
// 1. CONFIGURATION
// ============================================

const RTC_CONFIG = {
    iceServers: [
        // Google's public STUN server (free)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        
        // For production, add TURN servers:
        // {
        //     urls: 'turn:your-turn-server.com:3478',
        //     username: 'your-username',
        //     credential: 'your-password'
        // }
    ],
    iceCandidatePoolSize: 10
};

// ============================================
// 2. SIGNALING SIMULATION
// ============================================

/**
 * In a real application, this would be a WebSocket connection to a signaling server
 * For demo purposes, we simulate the signaling process
 */
class SignalingChannel {
    constructor() {
        this.onmessage = null;
        this.connected = false;
    }

    // Simulate connecting to signaling server
    connect() {
        console.log('Connecting to signaling server...');
        // In real app: this.ws = new WebSocket('wss://your-signaling-server.com');
        this.connected = true;
        console.log('Connected to signaling server');
    }

    // Send message to signaling server
    send(data) {
        console.log('Sending to signaling server:', data.type);
        // In real app: this.ws.send(JSON.stringify(data));
        
        // For demo: simulate receiving the message
        if (this.onmessage) {
            setTimeout(() => {
                this.onmessage({ data: JSON.stringify(data) });
            }, 100);
        }
    }

    // Close connection
    close() {
        this.connected = false;
        console.log('Disconnected from signaling server');
    }
}

// ============================================
// 3. WEBRTC MANAGER CLASS
// ============================================

class WebRTCManager {
    constructor(localVideoElement, remoteVideoElement) {
        this.localVideo = localVideoElement;
        this.remoteVideo = remoteVideoElement;
        this.localStream = null;
        this.peerConnection = null;
        this.signaling = new SignalingChannel();
        this.isInitiator = false;
        this.dataChannel = null;

        // Setup signaling handlers
        this.signaling.onmessage = this.handleSignalingMessage.bind(this);
    }

    // ============================================
    // 4. MEDIA CAPTURE
    // ============================================

    /**
     * Get user media (camera and microphone)
     */
    async startLocalMedia() {
        try {
            console.log('Requesting user media...');
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Display local video
            this.localVideo.srcObject = this.localStream;
            console.log('Local media started');
            
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media:', error);
            throw new Error(`Failed to access media: ${error.message}`);
        }
    }

    /**
     * Share screen instead of camera
     */
    async shareScreen() {
        try {
            console.log('Requesting screen share...');
            
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: true
            });

            // Replace video track in peer connection
            if (this.peerConnection) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }

            // Update local video
            this.localVideo.srcObject = screenStream;
            
            // Handle when user stops sharing
            screenStream.getVideoTracks()[0].onended = () => {
                if (this.localStream) {
                    this.localVideo.srcObject = this.localStream;
                }
            };

            console.log('Screen sharing started');
            return screenStream;
        } catch (error) {
            console.error('Error sharing screen:', error);
            throw new Error(`Failed to share screen: ${error.message}`);
        }
    }

    // ============================================
    // 5. PEER CONNECTION SETUP
    // ============================================

    /**
     * Create and configure peer connection
     */
    createPeerConnection() {
        console.log('Creating peer connection...');
        
        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
                console.log('Added track:', track.kind);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            this.remoteVideo.srcObject = event.streams[0];
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate generated');
                this.signaling.send({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            } else {
                console.log('All ICE candidates generated');
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);
            
            if (state === 'connected') {
                console.log('✅ Peers connected!');
            } else if (state === 'disconnected' || state === 'failed') {
                console.log('❌ Connection lost');
            } else if (state === 'closed') {
                console.log('Connection closed');
            }
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('ICE connection state:', state);
        };

        console.log('Peer connection created');
    }

    // ============================================
    // 6. DATA CHANNEL
    // ============================================

    /**
     * Create data channel for sending arbitrary data
     */
    createDataChannel(channelName = 'data') {
        if (!this.peerConnection) {
            throw new Error('Peer connection not created');
        }

        console.log('Creating data channel:', channelName);
        
        this.dataChannel = this.peerConnection.createDataChannel(channelName, {
            ordered: true, // Messages arrive in order
            maxPacketLifeTime: 3000 // Max retransmission time
        });

        // Setup data channel handlers
        this.dataChannel.onopen = () => {
            console.log('✅ Data channel opened');
        };

        this.dataChannel.onmessage = (event) => {
            console.log('Received data:', event.data);
            // Handle received data
            this.handleDataChannelMessage(event.data);
        };

        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };

        // Handle incoming data channel (from remote peer)
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            console.log('Received data channel:', channel.label);
            
            channel.onmessage = (event) => {
                this.handleDataChannelMessage(event.data);
            };
            
            channel.onopen = () => {
                console.log('Remote data channel opened');
            };
        };

        return this.dataChannel;
    }

    /**
     * Send data through data channel
     */
    sendData(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(data);
            console.log('Data sent:', data);
        } else {
            console.warn('Data channel not open');
        }
    }

    /**
     * Handle received data channel messages
     */
    handleDataChannelMessage(data) {
        // Try to parse as JSON, otherwise treat as string
        try {
            const message = JSON.parse(data);
            console.log('Received JSON:', message);
            // Handle different message types
            if (message.type === 'chat') {
                console.log('Chat message:', message.text);
            } else if (message.type === 'file') {
                console.log('File metadata:', message);
            }
        } catch (e) {
            console.log('Received text:', data);
        }
    }

    // ============================================
    // 7. SIGNALING (OFFER/ANSWER)
    // ============================================

    /**
     * Initiate call (create offer)
     */
    async initiateCall() {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }

        this.isInitiator = true;
        console.log('Initiating call...');

        try {
            // Create offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            // Set local description
            await this.peerConnection.setLocalDescription(offer);
            console.log('Offer created');

            // Send offer via signaling
            this.signaling.send({
                type: 'offer',
                offer: offer
            });

            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }

    /**
     * Handle incoming offer
     */
    async handleOffer(offer) {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }

        this.isInitiator = false;
        console.log('Handling offer...');

        try {
            // Set remote description
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            console.log('Answer created');

            // Send answer via signaling
            this.signaling.send({
                type: 'answer',
                answer: answer
            });

            return answer;
        } catch (error) {
            console.error('Error handling offer:', error);
            throw error;
        }
    }

    /**
     * Handle incoming answer
     */
    async handleAnswer(answer) {
        if (!this.peerConnection) {
            throw new Error('Peer connection not created');
        }

        console.log('Handling answer...');

        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
            console.log('Answer processed');
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    /**
     * Handle ICE candidate
     */
    async handleIceCandidate(candidate) {
        if (!this.peerConnection) {
            throw new Error('Peer connection not created');
        }

        try {
            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
            console.log('ICE candidate added');
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            throw error;
        }
    }

    /**
     * Handle signaling messages
     */
    async handleSignalingMessage(event) {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'offer':
                await this.handleOffer(message.offer);
                break;
            case 'answer':
                await this.handleAnswer(message.answer);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(message.candidate);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    // ============================================
    // 8. CLEANUP
    // ============================================

    /**
     * End call and cleanup
     */
    endCall() {
        console.log('Ending call...');

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            this.localStream = null;
        }

        // Close data channel
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        // Clear video elements
        this.localVideo.srcObject = null;
        this.remoteVideo.srcObject = null;

        // Close signaling
        this.signaling.close();

        console.log('Call ended');
    }
}

// ============================================
// 9. USAGE EXAMPLE
// ============================================

/*
// Initialize WebRTC Manager
const webrtc = new WebRTCManager(
    document.getElementById('localVideo'),
    document.getElementById('remoteVideo')
);

// Connect to signaling server
webrtc.signaling.connect();

// Start local media
await webrtc.startLocalMedia();

// Create data channel (optional)
webrtc.createDataChannel('chat');

// Initiate call
await webrtc.initiateCall();

// Send data through data channel
webrtc.sendData(JSON.stringify({
    type: 'chat',
    text: 'Hello from WebRTC!'
}));

// End call
webrtc.endCall();
*/

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebRTCManager, SignalingChannel };
}

