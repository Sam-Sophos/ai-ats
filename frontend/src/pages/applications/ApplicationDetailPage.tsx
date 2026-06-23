import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Download, CheckCircle2, XCircle,
  Sparkles, ChevronDown, ThumbsUp, AlertTriangle, ThumbsDown, GraduationCap
} from 'lucide-react'
import { applicationsApi } from '../../api/applications'
import { jobsApi } from '../../api/jobs'
import axiosInstance from '../../api/axiosInstance'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input, Badge, PageSpinner, EmptyState, AIScoreBadge, StatusBadge } from '../../components/ui'
import type { Skill } from '../../types'

// ─── Skill breakdown helpers ──────────────────────────────────────────────────
function normalise(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function computeBreakdown(jobSkills: Skill[], extractedSkills: Skill[]) {
  const extractedSet = new Map(extractedSkills.map((s) => [normalise(s.skill_name), s]))
  const jobSet = new Map(jobSkills.map((s) => [normalise(s.skill_name), s]))
  const matched: Skill[] = []
  const missing: Skill[] = []
  const additional: Skill[] = []
  for (const [key, skill] of jobSet) {
    if (extractedSet.has(key)) matched.push(skill)
    else missing.push(skill)
  }
  for (const [key, skill] of extractedSet) {
    if (!jobSet.has(key)) additional.push(skill)
  }
  return { matched, missing, additional }
}

function generateSummary(
  matched: Skill[], missing: Skill[], additional: Skill[], score: number | null
): string {
  const total = matched.length + missing.length
  if (total === 0) {
    return `No required skills were defined for this job. The candidate's resume contains ${additional.length} extracted skill${additional.length === 1 ? '' : 's'}.`
  }
  const matchLine = `This candidate matches ${matched.length} out of ${total} required skill${total === 1 ? '' : 's'}${score !== null ? ` (${score}%)` : ''}.`
  const strengthLine = matched.length > 0
    ? ` Strong alignment on: ${matched.slice(0, 4).map((s) => s.skill_name).join(', ')}${matched.length > 4 ? `, and ${matched.length - 4} more` : ''}.`
    : ' None of the required skills were found in the resume.'
  const gapLine = missing.length > 0
    ? ` Primary gap${missing.length > 1 ? 's' : ''}: ${missing.slice(0, 3).map((s) => s.skill_name).join(', ')}${missing.length > 3 ? `, and ${missing.length - 3} more` : ''}.`
    : ' No skill gaps — all required skills are covered.'
  const additionalLine = additional.length > 0
    ? ` The candidate also brings ${additional.length} additional skill${additional.length === 1 ? '' : 's'} beyond the requirements, including ${additional.slice(0, 3).map((s) => s.skill_name).join(', ')}.`
    : ''
  return matchLine + strengthLine + gapLine + additionalLine
}

// ─── AI Recommendation ────────────────────────────────────────────────────────
type RecommendationLevel = 'pending' | 'recommended' | 'review' | 'not_recommended'

interface Recommendation {
  level: RecommendationLevel
  label: string
  sublabel: string
  confidence: string
}

function getRecommendation(
  score: number | null,
  breakdown: { matched: Skill[]; missing: Skill[]; additional: Skill[] } | null,
  yearsExperience: number | null
): Recommendation {
  if (score === null) {
    return {
      level: 'pending',
      label: 'AI Analysis Pending',
      sublabel: 'Resume is still being processed.',
      confidence: '—',
    }
  }
  const missingCount = breakdown?.missing.length ?? 0
  const totalRequired = (breakdown?.matched.length ?? 0) + missingCount
  const missingRatio = totalRequired > 0 ? missingCount / totalRequired : 0

  if (score >= 75 && missingRatio <= 0.25) {
    const hasGoodExperience = yearsExperience === null || yearsExperience >= 2
    return {
      level: 'recommended',
      label: 'Recommended for Interview',
      sublabel: hasGoodExperience
        ? yearsExperience !== null
          ? `Strong match with ${yearsExperience} years of experience.`
          : 'Strong skill match — candidate covers most requirements.'
        : 'Strong skill match, but limited experience — consider junior role.',
      confidence: hasGoodExperience ? 'High' : 'Medium',
    }
  } else if (score >= 50 && missingRatio <= 0.5) {
    return {
      level: 'review',
      label: 'Needs Manual Review',
      sublabel: 'Partial match — assess skill gaps before proceeding.',
      confidence: 'Medium',
    }
  } else {
    return {
      level: 'not_recommended',
      label: 'Not Recommended at This Stage',
      sublabel: 'Significant skill gaps or low overall match.',
      confidence: 'Low',
    }
  }
}

const RECOMMENDATION_STYLES: Record<RecommendationLevel, {
  bg: string; border: string; icon: React.ElementType
  iconColor: string; labelColor: string; badge: string
}> = {
  pending: {
    bg: 'bg-gray-50', border: 'border-gray-200',
    icon: Sparkles, iconColor: 'text-gray-400', labelColor: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-600',
  },
  recommended: {
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    icon: ThumbsUp, iconColor: 'text-emerald-600', labelColor: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  review: {
    bg: 'bg-amber-50', border: 'border-amber-200',
    icon: AlertTriangle, iconColor: 'text-amber-500', labelColor: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
  },
  not_recommended: {
    bg: 'bg-red-50', border: 'border-red-200',
    icon: ThumbsDown, iconColor: 'text-red-500', labelColor: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const applicationId = Number(id)
  const { canManage } = useAuth()
  const queryClient = useQueryClient()

  const [scoreInput, setScoreInput] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [isLogExpanded, setIsLogExpanded] = useState(false)

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

  const jobQuery = useQuery({
    queryKey: ['job', application?.job.id],
    queryFn: () => jobsApi.get(application!.job.id),
    enabled: !!application?.job.id,
    staleTime: 10 * 60 * 1000,
  })
  const jobDetail = jobQuery.data?.data

  useEffect(() => {
    if (application) {
      setScoreInput(
        application.ai_match_score !== null ? String(application.ai_match_score) : ''
      )
    }
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
      const response = await axiosInstance.get(
        `/applications/${applicationId}/resume/`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      )
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
  const nextStatus =
    currentIndex >= 0 && currentIndex < sortedStatuses.length - 1
      ? sortedStatuses[currentIndex + 1]
      : null
  const scoreChanged =
    scoreInput !== '' && Number(scoreInput) !== application.ai_match_score

  const breakdown = jobDetail && application.extracted_skills
    ? computeBreakdown(jobDetail.skills, application.extracted_skills)
    : null
  const summary = breakdown
    ? generateSummary(breakdown.matched, breakdown.missing, breakdown.additional, application.ai_match_score)
    : null

  const recommendation = getRecommendation(application.ai_match_score, breakdown, application.years_experience ?? null)
  const recStyle = RECOMMENDATION_STYLES[recommendation.level]
  const RecIcon = recStyle.icon

  return (
    <div className="space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>

      {/* Header */}
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
              {application.current_status && (
                <StatusBadge statusName={application.current_status.status_name} />
              )}
              {application.ai_log?.human_override_applied && (
                <Badge variant="purple">Human Override Active</Badge>
              )}
            </div>
          </div>
          {canManage && nextStatus && (
            <Button loading={moveStatusMutation.isPending} onClick={() => moveStatusMutation.mutate(nextStatus.id)}>
              <CheckCircle2 className="w-4 h-4" />
              Move to {nextStatus.status_name}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Candidate info */}
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
          {/* Experience & Education */}
          {(application.years_experience !== null || application.education_level) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Experience & Education</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">AI extracted</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Experience</p>
                  {application.years_experience !== null ? (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {application.years_experience}
                        <span className="text-sm font-normal text-gray-500 ml-1">yrs</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {application.years_experience >= 7
                          ? 'Senior level'
                          : application.years_experience >= 3
                          ? 'Mid level'
                          : 'Junior level'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not detected</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Education</p>
                  {application.education_level ? (
                    <p className="text-sm font-medium text-gray-900 leading-snug">
                      {application.education_level}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not detected</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Match Breakdown */}
          {breakdown ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-700">AI Match Breakdown</h2>
              </div>
              {summary && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-900 leading-relaxed">{summary}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Matched Required Skills{' '}
                      <span className="text-emerald-600 font-bold">
                        {breakdown.matched.length}/{breakdown.matched.length + breakdown.missing.length}
                      </span>
                    </span>
                  </div>
                  {breakdown.matched.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-6">No required skills matched.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {breakdown.matched.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />{s.skill_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Missing Required Skills{' '}
                      <span className="text-red-500 font-bold">{breakdown.missing.length}</span>
                    </span>
                  </div>
                  {breakdown.missing.length === 0 ? (
                    <p className="text-xs text-emerald-600 pl-6 font-medium">All required skills are covered.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {breakdown.missing.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" />{s.skill_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Additional Candidate Skills{' '}
                      <span className="text-blue-600 font-bold">{breakdown.additional.length}</span>
                    </span>
                  </div>
                  {breakdown.additional.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-6">No skills beyond the requirements.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {breakdown.additional.map((s) => (
                        <span key={s.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {s.skill_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : application.extracted_skills.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Extracted Skills</h2>
              <div className="flex flex-wrap gap-2">
                {application.extracted_skills.map((skill) => (
                  <Badge key={skill.id} variant="green">{skill.skill_name}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* AI Technical Details — collapsible */}
          {application.ai_log && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setIsLogExpanded(!isLogExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-500">AI Technical Details</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLogExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isLogExpanded && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <dl className="grid grid-cols-2 gap-3 text-xs mt-4">
                    <div>
                      <dt className="text-gray-400">Tokens used</dt>
                      <dd className="text-gray-700 font-mono mt-0.5">{application.ai_log.tokens_used}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Processing time</dt>
                      <dd className="text-gray-700 font-mono mt-0.5">{application.ai_log.processing_time_ms}ms</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-gray-400">Timestamp</dt>
                      <dd className="text-gray-700 font-mono mt-0.5">
                        {new Date(application.ai_log.created_at).toLocaleString()}
                      </dd>
                    </div>
                    {application.ai_log.human_override_applied && (
                      <div className="col-span-2">
                        <dd className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                          Human override applied to this score
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* AI Recommendation */}
          <div className={`rounded-xl border p-5 ${recStyle.bg} ${recStyle.border}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${recStyle.bg}`}>
                <RecIcon className={`w-5 h-5 ${recStyle.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${recStyle.labelColor}`}>{recommendation.label}</p>
                <p className={`text-xs mt-0.5 ${recStyle.labelColor} opacity-75`}>{recommendation.sublabel}</p>
              </div>
            </div>
            {recommendation.level !== 'pending' && (
              <div className="mt-3 pt-3 border-t border-current border-opacity-10 flex items-center justify-between">
                <span className="text-xs text-gray-500">AI Confidence</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${recStyle.badge}`}>
                  {recommendation.confidence}
                </span>
              </div>
            )}
          </div>

          {/* AI Score + override */}
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

          {/* Status Timeline */}
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
                          {entry.changed_by
                            ? `${entry.changed_by.first_name} ${entry.changed_by.last_name}`
                            : 'Public application form'
                          }{' '}· {new Date(entry.date_changed).toLocaleDateString()}
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