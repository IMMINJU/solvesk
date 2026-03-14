'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useUpdateProfile, useChangePassword } from '@/features/user/hooks/use-profile-mutations'
import { Avatar } from '@/components/avatar'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SettingsPage() {
  const t = useTranslations()
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BounceLoader />
      </div>
    )
  }

  const user = session?.user

  return (
    <div className="max-w-[600px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground mb-8">{t('settings.title')}</h1>

      {/* Profile Section */}
      {user && <ProfileSection user={user} />}

      {/* Password Section */}
      <PasswordSection />
    </div>
  )
}

// ============================================
// Profile Section
// ============================================

function ProfileSection({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null }
}) {
  const t = useTranslations()
  const updateMutation = useUpdateProfile()
  const [name, setName] = useState(user.name ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    updateMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t('settings.profileUpdated'))
        },
      }
    )
  }

  return (
    <div className="mb-8 pb-8 border-b border-border">
      <h2 className="text-sm font-medium text-foreground mb-1">{t('settings.profile')}</h2>
      <p className="text-xs text-muted-foreground mb-4">{t('settings.profileDescription')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar preview */}
        <div className="flex items-center gap-3">
          <Avatar name={name || undefined} image={user.image} size="lg" />
          <div>
            <p className="text-sm font-medium text-foreground">{name || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">{t('users.name')}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label>{t('users.email')}</Label>
          <Input value={user.email ?? ''} disabled className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t('settings.emailReadonly')}</p>
        </div>

        <Button type="submit" size="sm" disabled={updateMutation.isPending || !name.trim()}>
          {updateMutation.isPending ? t('validation.saving') : t('common.save')}
        </Button>
      </form>
    </div>
  )
}

// ============================================
// Password Section
// ============================================

function PasswordSection() {
  const t = useTranslations()
  const changeMutation = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Inline validation
  const currentError = touched.current && !currentPassword ? t('validation.passwordRequired') : ''
  const newError = touched.new
    ? !newPassword
      ? t('validation.passwordRequired')
      : newPassword.length < 8
        ? t('validation.passwordMinLength')
        : ''
    : ''
  const confirmError = touched.confirm
    ? !confirmPassword
      ? t('validation.passwordRequired')
      : confirmPassword !== newPassword
        ? t('validation.passwordMismatch')
        : ''
    : ''
  const isFormValid =
    !!currentPassword && !!newPassword && newPassword.length >= 8 && newPassword === confirmPassword

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ current: true, new: true, confirm: true })
    if (!isFormValid) return

    changeMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success(t('auth.passwordChanged'))
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setTouched({})
        },
      }
    )
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-foreground mb-1">{t('settings.security')}</h2>
      <p className="text-xs text-muted-foreground mb-4">{t('settings.securityDescription')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">{t('auth.currentPassword')}</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, current: true }))}
            autoComplete="current-password"
            aria-invalid={!!currentError}
          />
          {currentError && <p className="text-xs text-destructive">{currentError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, new: true }))}
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!newError}
          />
          {newError && <p className="text-xs text-destructive">{newError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, confirm: true }))}
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!confirmError}
          />
          {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
        </div>

        <Button type="submit" size="sm" disabled={changeMutation.isPending || !isFormValid}>
          {changeMutation.isPending ? t('validation.saving') : t('auth.changePassword')}
        </Button>
      </form>
    </div>
  )
}
