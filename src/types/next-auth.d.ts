import 'next-auth'
import 'next-auth/jwt'

export type UserRole = 'admin' | 'agent' | 'customer'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      projectId: number | null
      mustChangePassword?: boolean
    }
  }

  interface User {
    role?: UserRole
    projectId?: number | null
    mustChangePassword?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    projectId: number | null
    mustChangePassword?: boolean
  }
}
