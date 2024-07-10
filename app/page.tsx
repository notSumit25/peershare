"use client";

import Image from "next/image";
import { useSearchParams } from 'next/navigation'
import { use, useEffect, useState } from "react";
import QRCode from 'qrcode.react';
import { fileURLToPath } from "url";
//@ts-ignore
import  RTCPeerConnectionManager from "./ws";
export default function Home({params}:any) {

  const [file, setFile] = useState<File>();
  const [code,setcode]=useState<string|undefined>()
  const [ReceiveCode,setReceiveCode]=useState<string>("")
  const [qr,setQr]=useState<string>('')
  const [ReceivedFile,setReceiveFile]=useState()

  const searchParams = useSearchParams()
  useEffect(()=>{
    const search = searchParams.get('code')
    if(search)
    {
      setReceiveCode(search)
    }
  },[])
 
  useEffect(() => {
    const receiveFile = async () => {
        if (ReceiveCode.length === 6) {
          const rtcManager = RTCPeerConnectionManager.getInstance();
            rtcManager.receiver(ReceiveCode, setReceiveFile)
        }
    };

    receiveFile();
}, [ReceiveCode,setReceiveFile]);

  function generateNumberCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomDigit = Math.floor(Math.random() * 10);
        code += randomDigit;
    }
    return code;
}

 const sendfile=async(file:any)=>{
  if (file) {
    const rtcManager = RTCPeerConnectionManager.getInstance();
    const socket=rtcManager.getSocket()
    const code=generateNumberCode();
    setcode(code)
    await rtcManager.sender(code, file);
   
}
 }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0]);
    sendfile(e.target.files?.[0])
  };
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <div className="w-96 h-96 flex flex-col gap-8">
        <div className="w-96 text-center h-48 flex flex-col justify-center items-center shadow-lg rounded-lg">
          {file ? (
          <>
           <div className="flex justify-between gap-4">
              <p>{file.name}</p>
              <button
                onClick={() => setFile(undefined)}
                className="ml-4 bg-red-500 text-white px-4 rounded-lg"
              >
                X
              </button>
            </div>
            <div>
                  {code}
                  <QRCode value={`http://localhost:3000?code=${code}`} />
            </div>
          </>
          ) : 
          <div>
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="fileInput" className="cursor-pointer">
              <Image src="/add.svg" width={100} height={100} alt="" />
              Send File
            </label>
          </div>
            }
        </div>
        <div className="w-96 text-center h-32 flex flex-col items-center justify-center shadow-lg rounded-lg gap-2">
          Receive File
          <input
            type="text"
            value={ReceiveCode}
            onChange={(e)=> setReceiveCode(e.target.value)}
            className="border py-1 px-2 w-60 text-sm bg-gray-200"
            placeholder="Input Key"
          />
        </div>
      </div>
    </div>
  );
}
