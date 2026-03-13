'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUsers } from '@/features/user/hooks/use-users'
import {
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetPassword,
} from '@/features/user/hooks/use-user-mutations'
import { useProjects } from '@/features/project/hooks/use-projects'
import { Avatar } from '@/components/avatar'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InlineSelect } from '@/components/ui/inline-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { ROLE_COLORS } from '@/config/issue'
import { Users as UsersIcon, Plus, RotateCcw, Copy, AlertCircle } from 'lucide-react'
import type { UserListItem } from '@/features/user/services/user.service'

export default function UsersPage() {
  const t = useTranslations()
  const { data: userResult, isLoading, isError, error } = useUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null)
  const [resetUser, setResetUser] = useState<UserListItem | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BounceLoader />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const users = userResult?.data ?? []
  const total = userResult?.pagination?.total ?? 0

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t('users.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('users.totalUsers', { count: total })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          {t('users.createUser')}
        </Button>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('users.noUsers')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1fr_180px_80px_120px_80px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium">
              <span>{t('users.name')}</span>
              <span>{t('users.email')}</span>
              <span>{t('users.role')}</span>
              <span>{t('users.project')}</span>
              <span>{t('common.actions')}</span>
            </div>
            {users.map(user => (
              <div
                key={user.id}
                className="group grid grid-cols-[1fr_180px_80px_120px_80px] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={user.name ?? undefined} image={user.image} size="sm" />
                  <span className="text-sm text-foreground truncate">{user.name ?? '-'}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 font-normal justify-center ${ROLE_COLORS[user.role] ?? ''}`}
                >
                  {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {user.project?.name ?? '-'}
                </span>
                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditUser(user)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => setResetUser(user)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={t('users.resetPassword')}
                    title={t('users.resetPassword')}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-1">
            {users.map(user => (
              <div key={user.id} className="px-3 py-3 rounded-md hover:bg-muted transition-colors">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Avatar name={user.name ?? undefined} image={user.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{user.name ?? '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 h-5 font-normal ${ROLE_COLORS[user.role] ?? ''}`}
                  >
                    {t(`roles.${user.role}` as Parameters<typeof t>[0])}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pl-10">
                  <span className="text-xs text-muted-foreground">{user.project?.name ?? '-'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditUser(user)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      aria-label={t('common.edit')}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setResetUser(user)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t('users.resetPassword')}
                      title={t('users.resetPassword')}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create User Dialog */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit User Dialog */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={open => !open && setEditUser(null)}
        />
      )}

      {/* Delete User Dialog */}
      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={open => !open && setDeleteUser(null)}
        />
      )}

      {/* Reset Password Dialog */}
      {resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          open={!!resetUser}
          onOpenChange={open => !open && setResetUser(null)}
        />
      )}
    </div>
  )
}

// ============================================
// Create User Dialog
// ============================================

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const createMutation = useCreateUser()
  const { data: projectResult } = useProjects()
  const projects = projectResult ?? []

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('agent')
  const [projectId, setProjectId] = useState<string>('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const roleOptions = (['admin', 'agent', 'customer'] as const).map(r => ({
    value: r,
    label: t(`roles.${r}` as Parameters<typeof t>[0]),
  }))

  const projectOptions = [
    { value: '', label: t('users.none') },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ]

  // Validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const nameError = touched.name && !name.trim() ? t('validation.nameRequired') : ''
  const emailError = touched.email
    ? !email.trim()
      ? t('validation.emailRequired')
      : !emailPattern.test(email)
        ? t('validation.emailInvalid')
        : ''
    : ''
  const passwordError = touched.password
    ? !password.trim()
      ? t('validation.passwordRequired')
      : password.length < 8
        ? t('validation.passwordMinLength')
        : ''
    : ''
  const customerProjectError =
    role === 'customer' && touched.project && !projectId
      ? t('validation.projectRequiredForCustomer')
      : ''
  const isFormValid =
    !!name.trim() &&
    !!email.trim() &&
    emailPattern.test(email) &&
    !!password.trim() &&
    password.length >= 8 &&
    (role !== 'customer' || !!projectId)

  function resetForm() {
    setName('')
    setEmail('')
    setPassword('')
    setRole('agent')
    setProjectId('')
    setTouched({})
  }

  function handleSubmit() {
    setTouched({ name: true, email: true, password: true, project: true })
    if (!isFormValid) return

    createMutation.mutate(
      {
        name,
        email,
        password,
        role: role as 'admin' | 'agent' | 'customer',
        projectId: projectId ? Number(projectId) : null,
      },
      {
        onSuccess: () => {
          toast.success(t('users.userCreated'))
          onOpenChange(false)
          resetForm()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.createUser')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('users.name')}</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              placeholder={t('users.name')}
              autoFocus
              aria-invalid={!!nameError}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('users.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              placeholder={t('users.email')}
              aria-invalid={!!emailError}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('users.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
              placeholder={t('users.password')}
              aria-invalid={!!passwordError}
            />
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Label>{t('users.role')}</Label>
              <InlineSelect value={role} options={roleOptions} onChange={setRole} portal={false} />
            </div>
            {role === 'customer' && (
              <div className="space-y-1.5 flex-1">
                <Label>{t('users.project')}</Label>
                <InlineSelect
                  value={projectId}
                  options={projectOptions}
                  onChange={v => {
                    setProjectId(v)
                    setTouched(prev => ({ ...prev, project: true }))
                  }}
                  portal={false}
                />
                {customerProjectError && (
                  <p className="text-xs text-destructive">{customerProjectError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={createMutation.isPending || !isFormValid}
            onClick={handleSubmit}
          >
            {createMutation.isPending ? t('validation.creating') : t('users.createUser')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Edit User Dialog
// ============================================

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()
  const { data: projectResult } = useProjects()
  const projects = projectResult ?? []

  const [name, setName] = useState(user.name ?? '')
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [projectId, setProjectId] = useState(user.projectId ? String(user.projectId) : '')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const roleOptions = (['admin', 'agent', 'customer'] as const).map(r => ({
    value: r,
    label: t(`roles.${r}` as Parameters<typeof t>[0]),
  }))

  const projectOptions = [
    { value: '', label: t('users.none') },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ]

  // Validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const nameError = touched.name && !name.trim() ? t('validation.nameRequired') : ''
  const emailError = touched.email
    ? !email.trim()
      ? t('validation.emailRequired')
      : !emailPattern.test(email)
        ? t('validation.emailInvalid')
        : ''
    : ''
  const customerProjectError =
    role === 'customer' && touched.project && !projectId
      ? t('validation.projectRequiredForCustomer')
      : ''
  const isFormValid =
    !!name.trim() &&
    !!email.trim() &&
    emailPattern.test(email) &&
    (role !== 'customer' || !!projectId)

  function handleSubmit() {
    setTouched({ name: true, email: true, project: true })
    if (!isFormValid) return

    updateMutation.mutate(
      {
        userId: user.id,
        data: {
          name,
          email,
          role: role as 'admin' | 'agent' | 'customer',
          projectId: projectId ? Number(projectId) : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('users.userUpdated'))
          onOpenChange(false)
        },
      }
    )
  }

  function handleDelete() {
    deleteMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(t('users.userDeleted'))
        setDeleteConfirmOpen(false)
        onOpenChange(false)
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('users.name')}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                autoFocus
                aria-invalid={!!nameError}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('users.email')}</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                aria-invalid={!!emailError}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <Label>{t('users.role')}</Label>
                <InlineSelect
                  value={role}
                  options={roleOptions}
                  onChange={setRole}
                  portal={false}
                />
              </div>
              {role === 'customer' && (
                <div className="space-y-1.5 flex-1">
                  <Label>{t('users.project')}</Label>
                  <InlineSelect
                    value={projectId}
                    options={projectOptions}
                    onChange={v => {
                      setProjectId(v)
                      setTouched(prev => ({ ...prev, project: true }))
                    }}
                    portal={false}
                  />
                  {customerProjectError && (
                    <p className="text-xs text-destructive">{customerProjectError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {t('users.deleteUser')}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={updateMutation.isPending || !isFormValid}
                onClick={handleSubmit}
              >
                {updateMutation.isPending ? t('validation.saving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>{t('users.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================
// Delete User Dialog (standalone)
// ============================================

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const deleteMutation = useDeleteUser()

  function handleDelete() {
    deleteMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(t('users.userDeleted'))
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.deleteUser')}</AlertDialogTitle>
          <AlertDialogDescription>{t('users.deleteConfirm')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================
// Reset Password Dialog
// ============================================

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const resetMutation = useResetPassword()
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  function handleReset() {
    resetMutation.mutate(user.id, {
      onSuccess: data => {
        const result = data as { temporaryPassword: string }
        setTempPassword(result.temporaryPassword)
        toast.success(t('users.passwordReset'))
      },
    })
  }

  function handleCopy() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword)
      toast.success(t('users.copied'))
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setTempPassword(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('users.resetPassword')}</DialogTitle>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('users.temporaryPassword')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {tempPassword}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                aria-label={t('users.copyPassword')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('users.resetPassword')} — {user.name ?? user.email}?
          </p>
        )}

        <DialogFooter className="pt-3">
          {tempPassword ? (
            <Button size="sm" onClick={() => handleClose(false)}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" disabled={resetMutation.isPending} onClick={handleReset}>
                {t('common.confirm')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
