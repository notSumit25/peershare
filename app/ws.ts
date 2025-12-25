import { time } from "console";
import { off } from "process";
import { io } from "socket.io-client";

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};


export default class RTCPeerConnectionManager {
    private static instance: RTCPeerConnectionManager | null = null;
    private socket: any;
    private pc: RTCPeerConnection | null;
    private dataChannel: any| null;
    private filename:string | null;

    private constructor() {
        this.socket = null;
        this.pc = null;
        this.dataChannel = null;
        this.filename=null
    }

    public static getInstance(): RTCPeerConnectionManager {
        if (!RTCPeerConnectionManager.instance) {
            RTCPeerConnectionManager.instance = new RTCPeerConnectionManager();
        }
        return RTCPeerConnectionManager.instance;
    }

    public getRTCConnection(): RTCPeerConnection {
        if (!this.pc) {
            this.pc = new RTCPeerConnection(configuration);
        }
        return this.pc;
    }

    public getSocket() {
        if (!this.socket) {
            this.socket = io("https://sendpeer2-backend.onrender.com");
        }
        return this.socket;
    }

    public async sender(roomId: any, file: any) {
        this.getSocket();
        this.socket.emit('message', {roomId,message:'sender' });
       
        this.pc = this.getRTCConnection();
    
        this.pc.onnegotiationneeded = async () => {
            this.socket.emit('createOffer', { roomId, offer: this.pc?.localDescription });
            const offer = await this.pc?.createOffer();
            await this.pc?.setLocalDescription(offer);
          
        };
        this.dataChannel = this.pc.createDataChannel('fileTransfer');
        this.dataChannel.binaryType = 'arraybuffer';
        const  CHUNK_SIZE=16000;
        this.dataChannel.onopen = () => {
            if (this.dataChannel) {
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.result) {
                        const arrayBuffer = reader.result as ArrayBuffer;
                        let offset = 0;
        
                        const sendChunk = () => {
                            if (offset < arrayBuffer.byteLength) {
                                const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
                                this.dataChannel?.send(chunk);
                                offset += CHUNK_SIZE;
        
                                if (this.dataChannel?.bufferedAmount > this.dataChannel?.bufferedAmountLowThreshold) {
                                    this.dataChannel.onbufferedamountlow = sendChunk;
                                } else {
                                    sendChunk();
                                }
                            }
                        };
        
                        sendChunk();
                    }
                };
                reader.readAsArrayBuffer(file);
          }
        };

        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
              
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };
        
        this.socket.on('requestOffer', () => {
            
            this.socket.emit('createOffer', { roomId, offer:this.pc?.localDescription });
        });
        this.socket.on('sendfile', () => {
            this.socket.emit('file',{roomId,file:file.name, filesize: file.size})
       });
      

        

        this.socket.on('receiverAnswer', async (ans: RTCSessionDescriptionInit) => {
            const answer :RTCSessionDescriptionInit ={
                sdp:ans.sdp,
                type:ans.type
             }
             if(!this.pc?.currentRemoteDescription){
                 await this.pc?.setRemoteDescription(answer);
                }
        });
        

        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });
    }

    public async receiver(roomId: any, fileCallback: (data: any) => void, completionCallback?: () => void) {

        this.getSocket();
        this.pc =  this.getRTCConnection();
        this.socket.emit('message', { roomId ,message:'receiver' });
        this.socket.emit('requestOffer', { roomId });
        
      
        this.socket.emit('sendfile',{roomId})
        this.socket.on('createOffer', async (offer: RTCSessionDescriptionInit) => {
            if (this.pc) {
                try {
                    // Set the remote offer description
                    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
                    
                    // Create an answer
                    const answer = await this.pc.createAnswer();
                    
                    // Set the local answer description
                    await this.pc.setLocalDescription(answer);
                    
                    // Emit the answer back to the signaling server
                    if (this.pc.localDescription) {
                        this.socket.emit('receiverAnswer', { roomId, ans: this.pc.localDescription });
                    }
                } catch (error) {
                    console.error('Error during offer handling:', error);
                }
            }
        });
        
        this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.socket.emit('iceCandidate', { roomId, candidate: event.candidate });
            }
        };
        let totalFileSize = 0;
        let receivedBytes = 0;
        this.socket.on('file',async({file,filesize}:any)=> {
          
           this.filename=file
           totalFileSize=filesize
        })
        
        this.socket.on('iceCandidate', (candidate: RTCIceCandidate) => {
            this.pc?.addIceCandidate(candidate);
        });
        
        this.pc.ondatachannel = (event: RTCDataChannelEvent) => {
            this.dataChannel = event.channel;
            const receivedChunks: ArrayBuffer[] = [];
        
            this.dataChannel.onmessage = (event: MessageEvent) => {
                const chunk = event.data as ArrayBuffer;
                receivedChunks.push(chunk);
                receivedBytes += chunk.byteLength;
                if (totalFileSize > 0) {
                    const progress = (receivedBytes / totalFileSize) * 100;
                    fileCallback(progress);  
                }
                if(chunk.byteLength !=16000)
                {
                    this.dataChannel.onclose()
                }
            };
        
            this.dataChannel.onclose = () => {
            
                // Concatenate all received chunks into a single ArrayBuffer
                const totalLength = receivedChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
                const concatenatedArrayBuffer = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of receivedChunks) {
                    concatenatedArrayBuffer.set(new Uint8Array(chunk), offset);
                    offset += chunk.byteLength;
                }
        
                // Create a Blob from the concatenated ArrayBuffer
                const blob = new Blob([concatenatedArrayBuffer.buffer], { type: 'application/octet-stream' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${this.filename}` // You can set the file name here
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Notify caller that the transfer has finished so UI can reset
                fileCallback(100);
                if (completionCallback) {
                    completionCallback();
                }
            };
        };
        }
}
