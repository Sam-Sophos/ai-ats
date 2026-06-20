import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Download, CheckCircle2 } from 'lucide-react'
import { applicationsApi } from '../../api/applications'
import axiosInstance from '../../api/axiosInstance'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input, Badge, PageSpinner, EmptyState, AIScoreBadge, StatusBadge } from '../../components/ui'

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const applicationId = Number(id)
  const { canManage } = useAuth()
  const queryClient = useQueryClient()

  const [scoreInput, setScoreInput] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')

  const applicationQuery = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => applicationsApi.get(applicationId),
    enabled: !!applicationId,
  })

  const statusesQuery = useQuery({
    queryKey: ['statuses'],
    queryFn: () => applicationsApi.listStatuses(),
    staleTime: 10 * 60 * 1000,
  })

  const application = applicationQuery.data?.data
  const statuses = statusesQuery.data?.data.results ?? []

  useEffect(() => {
    if (application) setScoreInput(application.ai_match_score !== null ? String(application.ai_match_score) : '')
  }, [application?.ai_match_score])

  const overrideScoreMutation = useMutation({
    mutationFn: (score: number) => applicationsApi.overrideScore(applicationId, score),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['application', applicationId] }),
  })

  const moveStatusMutation = useMutation({
    mutationFn: (statusId: number) => applicationsApi.moveStatus(applicationId, statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['application', applicationId] }),
  })

  async function handleViewResume() {
    setResumeError('')
    setResumeLoading(true)
    try {
      const response = await axiosInstance.get(`/applications/${applicationId}/resume/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch {
      setResumeError("Couldn't load the resume. Try again.")
    } finally {
      setResumeLoading(false)
    }
  }

  if (applicationQuery.isLoading) return <PageSpinner />

  if (applicationQuery.isError || !application) {
    return (
      <EmptyState
        icon={<FileText className="w-10 h-10" />}
        title="Application not found"
        description="This application may have been removed."
      />
    )
  }

  const sortedStatuses = [...statuses].sort((a, b) => a.sequence_order - b.sequence_order)
  const currentIndex = sortedStatuses.findIndex((s) => s.id === application.current_status?.id)
  const nextStatus = currentIndex >= 0 && currentIndex < sortedStatuses.length - 1
    ? sortedStatuses[currentIndex + 1]
    : null

  const scoreChanged =
    scoreInput !== '' && Number(scoreInput) !== application.ai_match_score

  return (
    <div className="space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {application.candidate.first_name} {application.candidate.last_name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {application.job.title} · {application.job.department_name} · Applied{' '}
              {new Date(application.applied_date).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {application.current_status && <StatusBadge statusName={application.current_status.status_name} />}
              {application.ai_log?.human_override_applied && (
                <Badge variant="purple">Human Override Active</Badge>
              )}
            </div>
          </div>

          {canManage && nextStatus && (
            <Button
              loading={moveStatusMutation.isPending}
              onClick={() => moveStatusMutation.mutate(nextStatus.id)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Move to {nextStatus.status_name}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Candidate Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Email</p>
                <p className="text-gray-900 mt-0.5">{application.candidate.email}</p>
              </div>
              <div>
                <p className="text-gray-400">Phone</p>
                <p className="text-gray-900 mt-0.5">{application.candidate.phone}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-gray-400" />
                Resume
              </span>
              <Button variant="secondary" size="sm" loading={resumeLoading} onClick={handleViewResume}>
                <Download className="w-4 h-4" />
                View / Download
              </Button>
            </div>
            {resumeError && <p className="text-xs text-red-600 mt-2">{resumeError}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Extracted Skills</h2>
            {application.extracted_skills.length === 0 ? (
              <p className="text-sm text-gray-400">No skills extracted yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {application.extracted_skills.map((skill) => (
                  <Badge key={skill.id} variant="green">{skill.skill_name}</Badge>
                ))}
              </div>
            )}
          </div>

          {application.ai_log && (
            <div className="bg-gray-900 rounded-xl p-6 text-gray-100">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">AI Processing Log</h2>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-400">
                <p>Tokens used: <span className="text-gray-200">{application.ai_log.tokens_used}</span></p>
                <p>Processing time: <span className="text-gray-200">{application.ai_log.processing_time_ms}ms</span></p>
                <p className="col-span-2">
                  Timestamp: <span className="text-gray-200">{new Date(application.ai_log.created_at).toLocaleString()}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">AI Match Score</h2>
            <AIScoreBadge score={application.ai_match_score} />

            {canManage && (
              <div className="mt-4 flex items-end gap-2">
                <Input
                  label="Override Score"
                  type="number"
                  min={0}
                  max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="!py-1.5"
                />
                <Button
                  size="sm"
                  disabled={!scoreChanged}
                  loading={overrideScoreMutation.isPending}
                  onClick={() => overrideScoreMutation.mutate(Number(scoreInput))}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Timeline</h2>
            {application.status_history.length === 0 ? (
              <p className="text-sm text-gray-400">No status changes yet.</p>
            ) : (
              <div className="space-y-4">
                {[...application.status_history]
                  .sort((a, b) => new Date(b.date_changed).getTime() - new Date(a.date_changed).getTime())
                  .map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        {i < application.status_history.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-gray-900">{entry.status.status_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.changed_by ? `${entry.changed_by.first_name} ${entry.changed_by.last_name}` : 'Public application form'} ·{' '}
                          {new Date(entry.date_changed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}