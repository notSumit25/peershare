import NextAuth from 'next-auth/next'
import GoogleProvider from 'next-auth/providers/google'

export const authoptions={
    providers:[
        GoogleProvider({
            clientId:process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET
        })
    ],
    secret :  process.env.NEXTAUTH_SECRET
}
const handler = NextAuth(authoptions)
export {handler as GET, handler as POST}