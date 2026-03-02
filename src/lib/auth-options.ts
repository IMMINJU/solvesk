import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/db'
import { users, projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.')
        }

        const email = credentials.email.toLowerCase()

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })

        if (!user) {
          throw new Error('Invalid email or password.')
        }

        if (!user.password) {
          throw new Error('Password not set. Contact your administrator.')
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password)

        if (!isValidPassword) {
          throw new Error('Invalid email or password.')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          projectId: user.projectId,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!
        token.role = (user as { role: string }).role as 'admin' | 'agent' | 'customer'
        token.projectId = (user as { projectId?: number | null }).projectId ?? null
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword
      }

      // Refresh user data on session update
      if (trigger === 'update') {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id),
        })
        if (dbUser) {
          token.role = dbUser.role
          token.projectId = dbUser.projectId
          token.mustChangePassword = dbUser.mustChangePassword
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.projectId = token.projectId
        session.user.mustChangePassword = token.mustChangePassword

        // Attach project info for customers
        if (token.projectId) {
          const project = await db.query.projects.findFirst({
            where: eq(projects.id, token.projectId),
          })
          if (project) {
            ;(session.user as { project?: { id: number; code: string; name: string } }).project = {
              id: project.id,
              code: project.code,
              name: project.name,
            }
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/en/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
