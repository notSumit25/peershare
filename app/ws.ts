import { io } from "socket.io-client";

export class RTCPeerConnectionManager {
    private static instance: RTCPeerConnectionManager | null = null;
    private socket: any;
    private pc: RTCPeerConnection | null;
    private dataChannel: RTCDataChannel | null;

    private constructor() {
        this.socket = null;
        this.pc = null;
        this.dataChannel = null;
    }

    public static getInstance(): RTCPeerConnectionManager {
        if (!RTCPeerConnectionManager.instance) {
            RTCPeerConnectionManager.instance = new RTCPeerConnectionManager();
        }
        return RTCPeerConnectionManager.instance;
    }

    public getRTCConnection(): RTCPeerConnection {
        if (!this.pc) {
            this.pc = new RTCPeerConnection();
        }
        return this.pc;
    }

    public getSocket() {
        if (!this.socket) {
            this.socket = io("https://localhost:3001");
        }
        return this.socket;
    }

    public async sender(roomId: any, file: any) {
        const sender = 'sender';
        this.socket.emit('message', { roomId, sender });

        this.pc = this.getRTCConnection();

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        this.dataChannel = this.pc.createDataChannel('fileTransfer');
        this.dataChannel.binaryType = 'arraybuffer';
        this.dataChannel.onopen = () => {
            if (this.dataChannel) {
                this.dataChannel.send(file);
            }
        };

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };

        this.pc.onnegotiationneeded = async () => {
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            this.socket.emit('createOffer', { roomId, offer });
        };

        this.socket.on('receiverAnswer', async (ans: RTCSessionDescriptionInit) => {
            await this.pc?.setRemoteDescription(ans);
        });

        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });
    }

    public async receiver(roomId: any, fileCallback: (data: any) => void) {
        const receiver = 'receiver';
        this.socket.emit('message', { roomId, receiver });

        this.pc = this.getRTCConnection();

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };

        this.socket.on('createOffer', async (offer: RTCSessionDescriptionInit) => {
            await this.pc?.setRemoteDescription(offer);
            const answer = await this.pc?.createAnswer();
            if (answer) {
                this.socket.emit('receiverAnswer', { roomId, ans: answer });
            }
        });

        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });

        this.pc.ondatachannel = (event: RTCDataChannelEvent) => {
            this.dataChannel = event.channel;
            this.dataChannel.onmessage = (event: MessageEvent) => {
                const data = event.data;
                console.log('Received data:', data);
                fileCallback(data);
            };
        };
    }
}
