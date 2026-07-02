import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, FileText, Sparkles, CalendarCheck } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import { PageSpinner, EmptyState } from '../components/ui'

const STATUS_COLORS: Record<string, string> = {
  Applied: 'bg-blue-500',
  Screening: 'bg-purple-500',
  Interview: 'bg-indigo-500',
  'Technical Assessment': 'bg-orange-500',
  Offer: 'bg-teal-500',
  Hired: 'bg-green-500',
  Rejected: 'bg-red-500',
  Withdrawn: 'bg-gray-400',
}

interface StatCardProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 60_000,
  })

  if (isLoading) return <PageSpinner />

  if (isError || !data) {
    return (
      <EmptyState
        title="Couldn't load dashboard"
        description="Something went wrong fetching your stats. Try refreshing the page."
      />
    )
  }

  const stats = data.data
  const maxStatusCount = Math.max(1, ...stats.applications_by_status.map((s) => s.count))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          An overview of hiring activity across your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5 text-blue-700" />}
          iconBg="bg-blue-100"
          label="Open Jobs"
          value={String(stats.open_jobs)}
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-purple-700" />}
          iconBg="bg-purple-100"
          label="Applications This Week"
          value={String(stats.applications_this_week)}
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-100"
          label="Avg. AI Match Score"
          value={stats.avg_ai_match_score !== null ? `${stats.avg_ai_match_score}%` : '—'}
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5 text-indigo-700" />}
          iconBg="bg-indigo-100"
          label="Interviews Scheduled"
          value={String(stats.interviews_scheduled)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Applications by Status</h2>
        {stats.applications_by_status.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Once candidates apply, their status breakdown will show up here."
          />
        ) : (
          <div className="space-y-3">
            {[...stats.applications_by_status]
              .sort((a, b) => b.count - a.count)
              .map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-gray-600 truncate">{status}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-400'}`}
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-sm text-gray-500 text-right">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}