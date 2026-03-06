'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, User, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_CONFIG } from '@/config/app'
import { api, ApiError } from '@/lib/api/client'

export default function OnboardingPage() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tAuth = useTranslations('auth')
  const tErrors = useTranslations('errors')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if onboarding already done
  useEffect(() => {
    api
      .get<{ needsOnboarding: boolean }>('/api/onboarding')
      .then(data => {
        if (!data.needsOnboarding) {
          router.replace('/auth/signin')
        } else {
          setIsChecking(false)
        }
      })
      .catch(() => setIsChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await api.post('/api/onboarding', { name, email, password })

      // Auto sign in after onboarding
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        router.push('/auth/signin')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tErrors('generic'))
      setIsLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <span className="text-primary-foreground text-2xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('welcome')}</h1>
          <p className="text-muted-foreground mt-2">{t('setupAdmin')}</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-8">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('adminName')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Admin"
                  required
                  className="pl-10 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('adminEmail')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="pl-10 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('adminPassword')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="pl-10 h-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {APP_CONFIG.name} — {APP_CONFIG.description}
              </p>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('getStarted')}...
                </>
              ) : (
                t('getStarted')
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          &copy; {new Date().getFullYear()} {APP_CONFIG.name}
        </p>
      </div>
    </div>
  )
}
