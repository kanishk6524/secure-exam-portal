import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { FirebaseAuthError, firebaseIsEmailVerified, firebaseSignInWithPassword } from "@/lib/firebase"

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase()
        const password = String(credentials?.password ?? "")
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        let emailVerified = user.emailVerified

        if (user.firebaseUid) {
          let idToken: string
          try {
            idToken = (await firebaseSignInWithPassword(email, password)).idToken
          } catch (error) {
            if (error instanceof FirebaseAuthError) return null
            throw error
          }
          emailVerified = await firebaseIsEmailVerified(idToken)
          if (emailVerified !== user.emailVerified) {
            await prisma.user.update({ where: { id: user.id }, data: { emailVerified } })
          }
        } else {
          if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
            return null
          }
        }

        if (!emailVerified) {
          throw new EmailNotVerifiedError()
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ""
        session.user.role = token.role ?? "STUDENT"
      }
      return session
    },
  },
  pages: { signIn: "/" },
})
