'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useProjectMembers } from '@/features/project/hooks/use-project-members'
import {
  useAddProjectMember,
  useRemoveProjectMember,
} from '@/features/project/hooks/use-project-member-mutations'
import { useUsers } from '@/features/user/hooks/use-users'
import { PAGINATION } from '@/config/limits'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserPlus, X } from 'lucide-react'

interface ProjectMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  projectName: string
}

export function ProjectMembersDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ProjectMembersDialogProps) {
  const t = useTranslations()
  const { data: members, isLoading } = useProjectMembers(open ? projectId : undefined)
  const addMutation = useAddProjectMember(projectId)
  const removeMutation = useRemoveProjectMember(projectId)

  // Fetch all users to find available agents (admin-only API, large pageSize to get all)
  const { data: usersResult } = useUsers({ pageSize: PAGINATION.maxPageSize })

  const allUsers = usersResult?.data ?? []
  const memberIds = new Set((members ?? []).map(m => m.userId))
  const availableAgents = allUsers.filter(u => u.role === 'agent' && !memberIds.has(u.id))

  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  function handleAdd() {
    if (!selectedAgentId) return
    addMutation.mutate(selectedAgentId, {
      onSuccess: () => {
        toast.success(t('projects.memberAdded'))
        setSelectedAgentId('')
      },
    })
  }

  function handleRemove(userId: string) {
    removeMutation.mutate(userId, {
      onSuccess: () => {
        toast.success(t('projects.memberRemoved'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('projects.manageMembers')} — {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member */}
          {availableAgents.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger size="sm" className="flex-1 text-xs">
                  <SelectValue placeholder={t('projects.selectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name ?? agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                disabled={!selectedAgentId || addMutation.isPending}
                onClick={handleAdd}
                className="gap-1 shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t('projects.addMember')}
              </Button>
            </div>
          )}

          {/* Member list */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">{t('common.loading')}</p>
          ) : members && members.length > 0 ? (
            <div className="space-y-1">
              {members.map(member => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <Avatar name={member.name ?? undefined} image={member.image} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {member.name ?? member.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(member.userId)}
                    disabled={removeMutation.isPending}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              {t('projects.noMembers')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
