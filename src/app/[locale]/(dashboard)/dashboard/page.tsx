'use client'

import { useTranslations } from 'next-intl'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard'
import { Link } from '@/i18n/navigation'
import { BounceLoader } from '@/components/ui/bounce-loader'
import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS } from '@/config/issue'
import { FileText, CheckCircle, Circle, UserCheck, AlertCircle } from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="p-4 rounded-lg bg-surface border border-border">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const t = useTranslations()
  const { data: stats, isLoading, isError, error } = useDashboardStats()

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
      <h1 className="text-3xl font-semibold text-foreground mb-8">{t('dashboard.title')}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard
          label={t('dashboard.totalIssues')}
          value={stats?.totalIssues ?? 0}
          icon={FileText}
        />
        <StatCard label={t('dashboard.openIssues')} value={stats?.openIssues ?? 0} icon={Circle} />
        <StatCard
          label={t('dashboard.resolvedIssues')}
          value={stats?.resolvedIssues ?? 0}
          icon={CheckCircle}
        />
        <StatCard
          label={t('dashboard.myAssigned')}
          value={stats?.myAssigned ?? 0}
          icon={UserCheck}
        />
      </div>

      {/* Recent Issues */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('dashboard.recentIssues')}
        </h2>

        {stats?.recentIssues && stats.recentIssues.length > 0 ? (
          <div className="space-y-0">
            {stats.recentIssues.map(issue => (
              <Link
                key={issue.id}
                href={`/issues`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors group"
              >
                <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">
                  {issue.issueKey}
                </span>
                <span className="text-sm text-foreground truncate flex-1">{issue.title}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 font-normal ${STATUS_COLORS[issue.status] ?? ''}`}
                >
                  {t(`status.${issue.status}` as Parameters<typeof t>[0])}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('issues.noIssues')}</p>
        )}
      </div>
    </div>
  )
}
