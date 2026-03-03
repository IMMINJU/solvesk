import { Bug, Lightbulb, HelpCircle, AlertCircle, type LucideIcon } from 'lucide-react'

// ── Enums ──────────────────────────────────────

export const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

export const ISSUE_TYPES = ['bug', 'feature', 'inquiry'] as const

export type IssueStatus = (typeof STATUSES)[number]
export type IssuePriority = (typeof PRIORITIES)[number]
export type IssueType = (typeof ISSUE_TYPES)[number]

// ── UI Mappings ────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-status-open text-status-open-foreground',
  in_progress: 'bg-status-in-progress text-status-in-progress-foreground',
  waiting: 'bg-status-waiting text-status-waiting-foreground',
  resolved: 'bg-status-resolved text-status-resolved-foreground',
  closed: 'bg-status-closed text-status-closed-foreground',
}

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-priority-urgent-foreground',
  high: 'text-priority-high-foreground',
  medium: 'text-priority-medium-foreground',
  low: 'text-priority-low-foreground',
}

export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-role-admin text-role-admin-foreground',
  agent: 'bg-role-agent text-role-agent-foreground',
  customer: 'bg-role-customer text-role-customer-foreground',
}

// ── Select Options (for InlineSelect / forms) ──

export interface SelectOption {
  value: string
  label: string
  icon: LucideIcon
}

export const TYPE_OPTIONS: SelectOption[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Feature', icon: Lightbulb },
  { value: 'inquiry', label: 'Inquiry', icon: HelpCircle },
]

export const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'urgent', label: 'Urgent', icon: AlertCircle },
  { value: 'high', label: 'High', icon: AlertCircle },
  { value: 'medium', label: 'Medium', icon: AlertCircle },
  { value: 'low', label: 'Low', icon: AlertCircle },
]
