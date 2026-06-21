import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Link as LinkIcon, Users, Star } from 'lucide-react'
import { interviewsApi } from '../../api/interviews'
import { useAuth } from '../../hooks/useAuth'
import { Button, Textarea, Badge, PageSpinner, EmptyState } from '../../components/ui'

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const interviewId = Number(id)
  const { user, canManage } = useAuth()
  const queryClient = useQueryClient()

  const [score, setScore] = useState(5)
  const [feedback, setFeedback] = useState('')

  const interviewQuery = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId),
    enabled: !!interviewId,
  })

  const submitEvaluationMutation = useMutation({
    mutationFn: () =>
      interviewsApi.submitEvaluation({
        interview: interviewId,
        score,
        written_feedback: feedback,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', interviewId] })
      setFeedback('')
      setScore(5)
    },
  })

  if (interviewQuery.isLoading) return <PageSpinner />

  if (interviewQuery.isError || !interviewQuery.data) {
    return (
      <EmptyState
        icon={<Calendar className="w-10 h-10" />}
        title="Interview not found"
        description="This interview may have been removed."
      />
    )
  }

  const interview = interviewQuery.data.data
  const isParticipant = !!user && interview.participants.some((p) => p.id === user.id)
  const canEvaluate = isParticipant || canManage

  return (
    <div className="space-y-6">
      <Link to="/interviews" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Interviews
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {interview.application.candidate_name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{interview.application.job_title}</p>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-400 flex items-center gap-1"><Calendar className="w-4 h-4" /> Date & Time</p>
            <p className="text-gray-900 mt-0.5">{new Date(interview.scheduled_date).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Meeting Link</p>
            <a href={interview.meeting_link} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline mt-0.5 block truncate">
              {interview.meeting_link}
            </a>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-gray-400 text-sm flex items-center gap-1 mb-2"><Users className="w-4 h-4" /> Participants</p>
          <div className="flex flex-wrap gap-2">
            {interview.participants.map((p) => (
              <Badge key={p.id} variant="indigo">{p.first_name} {p.last_name}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Evaluations</h2>
        {interview.evaluations.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No evaluations submitted yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {interview.evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {evaluation.evaluator.first_name} {evaluation.evaluator.last_name}
                  </p>
                  <Badge variant={evaluation.score >= 7 ? 'green' : evaluation.score >= 4 ? 'amber' : 'red'}>
                    {evaluation.score}/10
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">{evaluation.written_feedback}</p>
              </div>
            ))}
          </div>
        )}

        {canEvaluate ? (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Submit Your Evaluation</h3>
            <div className="flex items-center gap-2 mb-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setScore(n)} className="p-0.5">
                  <Star className={`w-5 h-5 ${n <= score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">{score}/10</span>
            </div>
            <Textarea
              placeholder="Share your feedback on this candidate..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => submitEvaluationMutation.mutate()}
                loading={submitEvaluationMutation.isPending}
                disabled={!feedback.trim()}
              >
                Submit Evaluation
              </Button>
            </div>
            {submitEvaluationMutation.isError && (
              <p className="text-sm text-red-600 mt-2">Couldn't submit your evaluation. Try again.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
            Only interview participants can submit an evaluation.
          </p>
        )}
      </div>
    </div>
  )
}