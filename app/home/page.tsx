"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | undefined>(undefined);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0]);
    console.log(file);
  }
  return (
    <div className="w-full h-screen flex justify-center items-center">
      <div className="w-96 h-96 flex flex-col gap-8">
        <div className="w-96 text-center h-48 flex flex-col justify-center items-center shadow-lg rounded-lg">
          <input type="file" id="fileInput" className="hidden" onChange={handleFileChange} />
          <label htmlFor="fileInput" className="cursor-pointer">
            <Image src="/add.svg" width={100} height={100} alt="" />
            Send File
          </label>
        </div>
        <div className="w-96 text-center h-32 flex flex-col items-center justify-center shadow-lg rounded-lg gap-2">
            Receive File
            <input type="text" className="border py-1 px-2 w-60 text-sm bg-gray-200" placeholder="Input Key" />
        </div>
      </div>
    </div>
  );
}
