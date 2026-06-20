import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText } from 'lucide-react'
import { applicationsApi } from '../../api/applications'
import { jobsApi } from '../../api/jobs'
import { Button, PageSpinner, EmptyState, AIScoreBadge, StatusBadge } from '../../components/ui'

const SORT_OPTIONS = [
  { value: '-applied_date', label: 'Newest First' },
  { value: 'applied_date', label: 'Oldest First' },
  { value: '-ai_match_score', label: 'AI Score: High to Low' },
  { value: 'ai_match_score', label: 'AI Score: Low to High' },
]

export default function ApplicationsListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [ordering, setOrdering] = useState('-applied_date')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, jobFilter, ordering])

  const jobsQuery = useQuery({
    queryKey: ['jobs', 'filter-options'],
    queryFn: () => jobsApi.list(),
    staleTime: 5 * 60 * 1000,
  })
  const jobs = jobsQuery.data?.data.results ?? []

  const applicationsQuery = useQuery({
    queryKey: ['applications', { search: debouncedSearch, job: jobFilter, ordering, page }],
    queryFn: () =>
      applicationsApi.list({
        search: debouncedSearch || undefined,
        job: jobFilter ? Number(jobFilter) : undefined,
        ordering,
        page,
      }),
  })

  const applications = applicationsQuery.data?.data.results ?? []
  const hasNext = !!applicationsQuery.data?.data.next
  const hasPrev = !!applicationsQuery.data?.data.previous

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track every candidate moving through your pipeline.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate or job title..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
        <select
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {applicationsQuery.isLoading ? (
          <PageSpinner />
        ) : applicationsQuery.isError ? (
          <EmptyState title="Couldn't load applications" description="Something went wrong. Try refreshing the page." />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="No applications found"
            description={search || jobFilter ? 'Try adjusting your filters.' : 'Applications will show up here once candidates apply.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">AI Match Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/applications/${app.id}`} className="font-medium text-blue-700 hover:underline">
                        {app.candidate_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.job_title}</td>
                    <td className="px-4 py-3">
                      <AIScoreBadge score={app.ai_match_score} />
                    </td>
                    <td className="px-4 py-3">
                      {app.current_status
                        ? <StatusBadge statusName={app.current_status.status_name} />
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(app.applied_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(hasNext || hasPrev) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}