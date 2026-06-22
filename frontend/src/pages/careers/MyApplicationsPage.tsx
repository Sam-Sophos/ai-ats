import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase } from 'lucide-react'
import { candidateAuthApi } from '../../api/candidateAuth'
import { PageSpinner, EmptyState, AIScoreBadge, StatusBadge } from '../../components/ui'

export default function MyApplicationsPage() {
  const applicationsQuery = useQuery({
    queryKey: ['careers', 'my-applications'],
    queryFn: () => candidateAuthApi.myApplications(),
    refetchInterval: 10000,
  })

  const applications = applicationsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Track the status of every role you've applied to.</p>
      </div>

      {applicationsQuery.isLoading ? (
        <PageSpinner />
      ) : applicationsQuery.isError ? (
        <EmptyState title="Couldn't load your applications" description="Something went wrong. Try refreshing the page." />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-10 h-10" />}
          title="No applications yet"
          description="Browse open roles and apply to get started."
          action={
            <Link to="/careers" className="text-blue-700 hover:underline text-sm font-medium">
              Browse Jobs
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">AI Match Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{app.job_title}</td>
                  <td className="px-4 py-3"><AIScoreBadge score={app.ai_match_score} /></td>
                  <td className="px-4 py-3">
                    {app.current_status ? <StatusBadge statusName={app.current_status.status_name} /> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(app.applied_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}