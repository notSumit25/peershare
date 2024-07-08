"use client"
import Image from "next/image";
import GoogleButton from 'react-google-button'
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
export default function Home() {
  const session=useSession();
  const router=useRouter();
  if(session.status=='authenticated')
  {
    router.push('/home')
  }
  return (
   <main className="text-center w-full mx-auto max-w-[1240px] mt-16">
     <h1 className="text-4xl font-bold"> Auth Page</h1>
     <GoogleButton  onClick={()=> signIn('google')} className ='mx-auto mt-16'/>
   </main>
  );
}
