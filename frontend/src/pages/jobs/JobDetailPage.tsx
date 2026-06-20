import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Briefcase, Calendar, User as UserIcon } from 'lucide-react'
import { jobsApi } from '../../api/jobs'
import { applicationsApi } from '../../api/applications'
import { PageSpinner, EmptyState, Badge, AIScoreBadge, StatusBadge } from '../../components/ui'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId),
    enabled: !!jobId,
  })

  const applicationsQuery = useQuery({
    queryKey: ['applications', { job: jobId, ordering: '-ai_match_score' }],
    queryFn: () => applicationsApi.list({ job: jobId, ordering: '-ai_match_score' }),
    enabled: !!jobId,
  })

  if (jobQuery.isLoading) return <PageSpinner />

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <EmptyState
        icon={<Briefcase className="w-10 h-10" />}
        title="Job not found"
        description="This job posting may have been removed."
      />
    )
  }

  const job = jobQuery.data.data
  const applications = applicationsQuery.data?.data.results ?? []

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> {job.department.name}
              </span>
              <span className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" /> {job.created_by.first_name} {job.created_by.last_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Posted {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Badge variant="blue">
            {job.application_count} applicant{job.application_count === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Required Skills</h2>
          {job.skills.length === 0 ? (
            <p className="text-sm text-gray-400">No skills specified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill.id} variant="gray">{skill.skill_name}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Job Description</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Applications</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sorted by AI match score, highest first.</p>
        </div>

        {applicationsQuery.isLoading ? (
          <PageSpinner />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Once candidates apply to this job, they'll show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
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
      </div>
    </div>
  )
}