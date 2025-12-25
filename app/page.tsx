"use client";

import Image from "next/image";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from "react";
import QRCode from 'qrcode.react';
//@ts-ignore
import RTCPeerConnectionManager from "./ws";

function MainComponent() {
  const [file, setFile] = useState<File>();
  const [code, setCode] = useState<string | undefined>();
  const [receiveCode, setReceiveCode] = useState<string>("");
  const [qr, setQr] = useState<string>('');
  const [progress, setProgress] = useState<number | null>(null);

  const handleReceiveComplete = () => {
    setReceiveCode("");
    setProgress(null);
    if (typeof window !== "undefined") {
      const basePath = window.location.pathname || "/";
      window.history.replaceState({}, "", basePath);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.get('code');
    if (search) {
      setReceiveCode(search);
    }
  }, [searchParams]);

  useEffect(() => {
    const receiveFile = async () => {
      if (receiveCode.length === 6) {
        const rtcManager = RTCPeerConnectionManager.getInstance();
        rtcManager.receiver(receiveCode, setProgress, handleReceiveComplete);
      }
    };
    receiveFile();
  }, [receiveCode]);

  function generateNumberCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomDigit = Math.floor(Math.random() * 10);
      code += randomDigit;
    }
    return code;
  }

  const sendFile = async (file: File) => {
    if (file) {
      const rtcManager = RTCPeerConnectionManager.getInstance();
      const socket = rtcManager.getSocket();
      const code = generateNumberCode();
      setCode(code);
      await rtcManager.sender(code, file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      sendFile(selectedFile);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white/90 border border-slate-200 shadow-2xl rounded-2xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">PeerShare</h1>
          <p className="text-sm text-slate-600 mt-1">A simple, classic way to send files directly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-slate-900">Sender</p>
              <span className="text-xs uppercase tracking-wide text-slate-500">Step 1</span>
            </div>
            <p className="text-sm text-slate-600">Pick a file and share the code or link with your receiver.</p>
            {file ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm text-slate-800 truncate" title={file.name}>{file.name}</p>
                  <button
                    onClick={() => setFile(undefined)}
                    className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors px-3 py-1 rounded-md"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Share this code, link, or the QR below</p>
                  <p className="text-sm font-semibold text-slate-900">Code: <span className="text-blue-700">{code}</span></p>
                  <p className="text-sm font-medium text-blue-700 break-all">https://peershare-ten.vercel.app?code={code}</p>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <QRCode value={`https://peershare-ten.vercel.app?code=${code}`} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-6">
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center gap-2 text-blue-700 hover:text-blue-800 transition-colors">
                  <Image src="/add.svg" width={80} height={80} alt="Send File" />
                  <span className="text-sm font-semibold">Choose a file</span>
                </label>
                <p className="text-xs text-slate-500">Your code and link will appear here after selecting a file.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-slate-900">Receiver</p>
              <span className="text-xs uppercase tracking-wide text-slate-500">Step 2</span>
            </div>
            <p className="text-sm text-slate-600">Enter the 6-digit code or paste the shared link from the sender.</p>
            <input
              type="text"
              value={receiveCode}
              onChange={(e) => setReceiveCode(e.target.value)}
              className="border border-slate-300 rounded-lg py-2 px-3 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter 6-digit code"
            />
            <p className="text-xs text-slate-500">We start receiving automatically when the code matches.</p>
          </div>
        </div>

        {progress !== null && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-800">Transfer progress</p>
              <span className="text-xs text-slate-500">{progress.toFixed(2)}%</span>
            </div>
            <progress value={progress} max="100" className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${progress}%` }}></div>
            </progress>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainComponent />
    </Suspense>
  );
}
