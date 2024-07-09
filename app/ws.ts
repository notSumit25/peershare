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
        this.getSocket();
        this.socket.emit('message', {roomId,message:'sender' });
        console.log(roomId,file)
        this.pc = this.getRTCConnection();

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
         console.log('offer by sender',offer)
        this.dataChannel = this.pc.createDataChannel('fileTransfer');
        this.dataChannel.binaryType = 'arraybuffer';
        this.dataChannel.onopen = () => {
            if (this.dataChannel) {
                this.dataChannel.send(file);
            }
        };

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                console.log('iceCandidate', event.candidate);
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };
        
        this.socket.on('requestOffer', () => {
             console.log("request reach to sender")
            this.socket.emit('createOffer', { roomId, offer:this.pc?.localDescription });
        });
       

        this.pc.onnegotiationneeded =  () => {
            this.socket.emit('createOffer', { roomId, offer: this.pc?.localDescription });
        };

        this.socket.on('receiverAnswer', async (ans: RTCSessionDescriptionInit) => {
            console.log('ans is set',ans)
            const P :RTCSessionDescriptionInit ={
                sdp:ans.sdp,
                type:ans.type
             }
             console.log('p',P)
             if(!this.pc?.currentRemoteDescription){
                 await this.pc?.setRemoteDescription(P);
                }
        });
        

        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });
    }

    public async receiver(roomId: any, fileCallback: (data: any) => void) {

        this.getSocket();
        this.pc =  this.getRTCConnection();
        this.socket.emit('message', { roomId ,message:'receiver' });
        this.socket.emit('requestOffer', { roomId });
     
        this.socket.on('createOffer', (offer: RTCSessionDescriptionInit) => {
            console.log("offer recieved by rec",offer)
            this.pc?.setRemoteDescription(offer).then(()=>{
                this.pc?.createAnswer().then((answer: RTCSessionDescriptionInit)=>{
                    console.log(answer)
                 this.pc?.setLocalDescription(answer).then(()=>{
                     this.socket.emit('receiverAnswer', { roomId, ans: this.pc?.localDescription }); 
                 })
                });   
             })
        });
       
        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
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
        }
}
