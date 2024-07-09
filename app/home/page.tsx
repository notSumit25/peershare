"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from 'qrcode.react';
import { fileURLToPath } from "url";
//@ts-ignore
import  RTCPeerConnectionManager from "../ws";
export default function Home() {
  const [file, setFile] = useState<File>();
  const [code,setcode]=useState<string|undefined>()
  const [ReceiveCode,setReceiveCode]=useState<string>("")
  const [qr,setQr]=useState<string>('')
  const [ReceivedFile,setReceiveFile]=useState()

  useEffect(()=>{
    if(ReceiveCode.length == 6)
    {

      //  RTCPeerConnectionManager.getInstance().getSocket().getRTCConnection().receiver(ReceiveCode,setReceiveFile);
       console.log("file received",ReceivedFile)
    }
  },[ReceiveCode])

  function generateNumberCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        const randomDigit = Math.floor(Math.random() * 10);
        code += randomDigit;
    }
    return code;
}
function generateQRCode() {
    if(file){
    const fileURL = URL.createObjectURL(file)
     setQr(fileURL)
    }
}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0]);
    //generate code
    console.log(file)
    const code=generateNumberCode();
    setcode(code)
    generateQRCode()
    console.log(RTCPeerConnectionManager.getInstance().getSocket())
    // RTCPeerConnectionManager.getInstance().getSocket().getRTCConnection().sender(code,file);
   
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
                  <QRCode value={qr} />
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
            className="border py-1 px-2 w-60 text-sm bg-gray-200"
            placeholder="Input Key"
          />
        </div>
      </div>
    </div>
  );
}
