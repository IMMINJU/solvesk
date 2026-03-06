import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await getServerSession(authOptions)

  if (session) {
    redirect(`/${locale}/dashboard`)
  } else {
    redirect(`/${locale}/auth/signin`)
  }
}
