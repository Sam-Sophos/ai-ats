import { useState, useEffect } from 'react'
import type { DragEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Briefcase, UploadCloud, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { jobsApi } from '../../api/jobs'
import { candidateAuthApi } from '../../api/candidateAuth'
import { useCandidateAuth } from '../../hooks/useCandidateAuth'
import { useTaskPoller } from '../../hooks/useTaskPoller'
import { Button, Badge, PageSpinner, EmptyState, AIScoreBadge } from '../../components/ui'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.'
  if (file.type !== 'application/pdf') return 'Only PDF files are accepted.'
  if (file.size > MAX_SIZE_BYTES) {
    return `File must be 5MB or smaller (yours is ${(file.size / 1024 / 1024).toFixed(1)}MB).`
  }
  return null
}

type ApplyState = 'form' | 'submitting' | 'polling' | 'success' | 'error'

export default function CareersJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)
  const navigate = useNavigate()
  const { isAuthenticated } = useCandidateAuth()

  const [applyState, setApplyState] = useState<ApplyState>('form')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  const { status: taskStatus, error: pollError } = useTaskPoller(applyState === 'polling' ? taskId : null)

  const jobQuery = useQuery({
    queryKey: ['careers', 'job', jobId],
    queryFn: () => jobsApi.get(jobId),
    enabled: !!jobId,
  })

  useEffect(() => {
    if (applyState !== 'polling') return
    if (taskStatus?.status === 'SUCCESS') {
      setApplyState('success')
    } else if (taskStatus?.status === 'FAILURE') {
      setApplyState('error')
      setSubmitError(taskStatus.result?.error ?? 'The AI was unable to process your resume.')
    } else if (pollError) {
      setApplyState('error')
      setSubmitError(pollError)
    }
  }, [taskStatus, pollError, applyState])

  function handleFileSelect(selected: File) {
    const error = validateFile(selected)
    if (error) {
      setFileError(error)
      setFile(null)
      return
    }
    setFileError('')
    setFile(selected)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFileSelect(dropped)
  }

  async function handleSubmit() {
    if (!file) return
    setApplyState('submitting')
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.append('job', String(jobId))
      formData.append('resume_file', file)
      const { data } = await candidateAuthApi.apply(formData)
      setTaskId(data.task_id ?? null)
      setApplyState('polling')
    } catch (err: any) {
      setApplyState('error')
      setSubmitError(
        err?.response?.data?.resume_file?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        "Couldn't submit your application. Please try again."
      )
    }
  }

  function handleRetry() {
    setApplyState('form')
    setFile(null)
    setTaskId(null)
    setSubmitError('')
  }

  if (jobQuery.isLoading) return <PageSpinner />

  if (jobQuery.isError || !jobQuery.data) {
    return (
      <EmptyState
        icon={<Briefcase className="w-10 h-10" />}
        title="Job not found"
        description="This position may no longer be open."
      />
    )
  }

  const job = jobQuery.data.data

  return (
    <div className="space-y-6">
      <Link to="/careers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to all jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Badge variant="blue">{job.department.name}</Badge>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{job.title}</h1>

            <div className="mt-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Required Skills</h2>
              {job.skills.length === 0 ? (
                <p className="text-sm text-gray-400">No specific skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill.id} variant="gray">{skill.skill_name}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">About the Role</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Apply for this Role</h2>

          {!isAuthenticated ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">Sign in to your account to apply for this position.</p>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => navigate('/careers/login')}>Sign In</Button>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/careers/register')}>
                  Create an Account
                </Button>
              </div>
            </div>
          ) : applyState === 'form' || applyState === 'submitting' ? (
            <div className="space-y-4">
              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag and drop your resume, or{' '}
                    <label className="text-blue-700 hover:underline cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const selected = e.target.files?.[0]
                          if (selected) handleFileSelect(selected)
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF only, max 5MB</p>
                </div>
              ) : (
                <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-gray-700 truncate">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {file.name}
                  </span>
                  <button onClick={() => setFile(null)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              )}

              {fileError && <p className="text-xs text-red-600">{fileError}</p>}

              <Button className="w-full" disabled={!file} loading={applyState === 'submitting'} onClick={handleSubmit}>
                Submit Application
              </Button>
            </div>
          ) : applyState === 'polling' ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900">AI is analyzing your resume...</p>
              <p className="text-xs text-gray-400 mt-1">This usually takes a few seconds.</p>
            </div>
          ) : applyState === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-3">Application submitted!</p>
              {taskStatus?.result?.ai_match_score !== undefined && (
                <div className="flex justify-center mb-4">
                  <AIScoreBadge score={taskStatus.result.ai_match_score ?? null} />
                </div>
              )}
              <Button className="w-full" onClick={() => navigate('/careers/my-applications')}>
                View My Applications
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">Something went wrong</p>
              <p className="text-xs text-gray-500 mb-4">{submitError}</p>
              <Button variant="secondary" className="w-full" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}