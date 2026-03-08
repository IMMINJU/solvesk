'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { Link } from '@/i18n/navigation'
import { useProjects } from '@/features/project/hooks/use-projects'
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/features/project/hooks/use-project-mutations'
import type { ProjectListItem } from '@/features/project/services/project.service'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProjectMembersDialog } from '@/components/issues/project-members-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, FolderKanban, Users, AlertCircle } from 'lucide-react'
import { isAdmin as checkAdmin } from '@/lib/permissions-config'

export default function ProjectsPage() {
  const t = useTranslations()
  const { data: session } = useSession()
  const { data: projects, isLoading, isError, error } = useProjects()
  const isAdmin = checkAdmin(session?.user?.role)

  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<ProjectListItem | null>(null)
  const [membersProject, setMembersProject] = useState<ProjectListItem | null>(null)

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

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-foreground">{t('projects.title')}</h1>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t('projects.createProject')}
          </Button>
        )}
      </div>

      {projects && projects.length > 0 ? (
        <div>
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1fr_80px_100px_auto] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium">
            <span>{t('projects.projectName')}</span>
            <span className="text-right">{t('projects.issueCount')}</span>
            <span>{t('projects.created')}</span>
            {isAdmin && <span className="w-24" />}
          </div>

          {/* Desktop table rows */}
          <div className="hidden md:block space-y-0">
            {projects.map(project => (
              <div
                key={project.id}
                className="grid grid-cols-[1fr_80px_100px_auto] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted transition-colors group"
              >
                <Link
                  href={`/projects/${project.code}`}
                  className="flex items-center gap-2 min-w-0"
                >
                  <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-foreground font-medium truncate block">
                      {project.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                  </div>
                </Link>
                <span className="text-sm text-muted-foreground text-right tabular-nums">
                  {project.issueCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity w-24 justify-end">
                    <button
                      onClick={() => setMembersProject(project)}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      aria-label={t('projects.manageMembers')}
                      title={t('projects.manageMembers')}
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setEditProject(project)}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <DeleteProjectButton projectId={project.id} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-1">
            {projects.map(project => (
              <div
                key={project.id}
                className="px-3 py-3 rounded-md hover:bg-muted transition-colors"
              >
                <Link href={`/projects/${project.code}`} className="flex items-center gap-2 mb-1">
                  <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground font-medium truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
                </Link>
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {project.issueCount} {t('projects.issueCount').toLowerCase()}
                    </span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMembersProject(project)}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        aria-label={t('projects.manageMembers')}
                        title={t('projects.manageMembers')}
                      >
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setEditProject(project)}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <DeleteProjectButton projectId={project.id} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('projects.noProjects')}</p>
      )}

      {/* Create Dialog */}
      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />

      {/* Edit Dialog */}
      {editProject && (
        <ProjectFormDialog
          open={!!editProject}
          onOpenChange={open => !open && setEditProject(null)}
          mode="edit"
          project={editProject}
        />
      )}

      {/* Members Dialog */}
      {membersProject && (
        <ProjectMembersDialog
          open={!!membersProject}
          onOpenChange={open => !open && setMembersProject(null)}
          projectId={membersProject.id}
          projectName={membersProject.name}
        />
      )}
    </div>
  )
}

// ============================================
// Form Dialog (Create / Edit)
// ============================================

function ProjectFormDialog({
  open,
  onOpenChange,
  mode,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  project?: ProjectListItem
}) {
  const t = useTranslations()
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()

  const [name, setName] = useState(project?.name ?? '')
  const [code, setCode] = useState(project?.code ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const isCreate = mode === 'create'
  const isPending = createMutation.isPending || updateMutation.isPending

  // Validation
  const codePattern = /^[A-Z][A-Z0-9_]*$/
  const nameError = touched.name && !name.trim() ? t('validation.nameRequired') : ''
  const codeError =
    isCreate && touched.code
      ? !code.trim()
        ? t('validation.codeRequired')
        : !codePattern.test(code)
          ? t('validation.codeInvalid')
          : ''
      : ''
  const isFormValid = !!name.trim() && (!isCreate || (!!code.trim() && codePattern.test(code)))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ name: true, code: true })
    if (!isFormValid) return

    if (isCreate) {
      createMutation.mutate(
        { name, code: code.toUpperCase(), description: description || undefined },
        {
          onSuccess: () => {
            toast.success(t('projects.projectCreated'))
            onOpenChange(false)
          },
        }
      )
    } else if (project) {
      updateMutation.mutate(
        {
          id: project.id,
          data: {
            name,
            description: description || null,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('projects.projectUpdated'))
            onOpenChange(false)
          },
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? t('projects.createProject') : t('projects.editProject')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="project-name">{t('projects.projectName')}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              required
              maxLength={255}
              autoFocus
              aria-invalid={!!nameError}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {isCreate && (
            <div className="space-y-1">
              <Label htmlFor="project-code">{t('projects.projectCode')}</Label>
              <Input
                id="project-code"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onBlur={() => setTouched(prev => ({ ...prev, code: true }))}
                required
                maxLength={10}
                pattern="^[A-Z][A-Z0-9_]*$"
                className="font-mono"
                aria-invalid={!!codeError}
              />
              {codeError ? (
                <p className="text-xs text-destructive">{codeError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">{t('projects.codeHint')}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="project-desc">
              {t('projects.projectDescription')}
              <span className="font-normal ml-1">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !isFormValid}>
              {isPending
                ? isCreate
                  ? t('validation.creating')
                  : t('validation.saving')
                : isCreate
                  ? t('common.create')
                  : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Delete Button
// ============================================

function DeleteProjectButton({ projectId }: { projectId: number }) {
  const t = useTranslations()
  const deleteMutation = useDeleteProject()

  return (
    <ConfirmDeleteButton
      onDelete={() =>
        deleteMutation.mutate(projectId, {
          onSuccess: () => toast.success(t('projects.projectDeleted')),
        })
      }
      isPending={deleteMutation.isPending}
    />
  )
}
