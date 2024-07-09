import { off } from "process";
import { io } from "socket.io-client";

export default class RTCPeerConnectionManager {
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
            this.socket = io("http://localhost:3001");
        }
        return this.socket;
    }

    public async sender(roomId: any, file: any) {
        this.socket.emit('message', {roomId,message:'sender' });
        console.log(roomId,file)
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
        
        this.socket.on('requestOffer', async () => {
            this.socket.emit('createOffer', { roomId, offer });
        });
       

        this.pc.onnegotiationneeded = async () => {
            this.socket.emit('createOffer', { roomId, offer });
        };

        this.socket.on('receiverAnswer', async (ans: RTCSessionDescriptionInit) => {
            console.log('ans is set')
            await this.pc?.setRemoteDescription(ans);
        });
        

        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });
    }

    public async receiver(roomId: any, fileCallback: (data: any) => void) {
        this.socket.emit('message', { roomId ,message:'receiver' });
         console.log('hey')
        this.pc =  this.getRTCConnection();

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };
        
       
        
        const handleOffer = async (offer: RTCSessionDescriptionInit) => {
            try {
                await this.pc?.setRemoteDescription(offer);
                const answer = await this.pc?.createAnswer(); 
                console.log('ans',answer)
                if (answer) {
                    await this.pc?.setLocalDescription(answer); // Set local description
                    this.socket.emit('receiverAnswer', { roomId, ans: answer }); // Send answer to sender
                }
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        };
        
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
        this.socket.on('createOffer', async(offer: RTCSessionDescriptionInit) => {
            console.log("offer recieved",offer)
           await handleOffer(offer)
        });
        this.socket.emit('requestOffer', { roomId });
    }
}
