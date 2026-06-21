import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Calendar as CalendarIcon, Users as UsersIcon, X } from 'lucide-react'
import { interviewsApi } from '../../api/interviews'
import { applicationsApi } from '../../api/applications'
import { authApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input, Modal, Badge, PageSpinner, EmptyState } from '../../components/ui'
import type { ApplicationList, User, InterviewWritePayload } from '../../types'

const interviewSchema = z.object({
  scheduled_date: z.string().min(1, 'Pick a date and time'),
  meeting_link: z.string().url('Enter a valid URL'),
})
type InterviewFormValues = z.infer<typeof interviewSchema>

function ScheduleInterviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [selectedApplication, setSelectedApplication] = useState<ApplicationList | null>(null)
  const [appQuery, setAppQuery] = useState('')
  const [debouncedAppQuery, setDebouncedAppQuery] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAppQuery(appQuery), 300)
    return () => clearTimeout(t)
  }, [appQuery])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
  })

  const appsQuery = useQuery({
    queryKey: ['applications', 'interview-search', debouncedAppQuery],
    queryFn: () => applicationsApi.list({ search: debouncedAppQuery }),
    enabled: debouncedAppQuery.length > 0,
  })
  const appResults = appsQuery.data?.data.results ?? []

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    staleTime: 5 * 60 * 1000,
  })
  const users = usersQuery.data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: InterviewWritePayload) => interviewsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      handleClose()
    },
  })

  function handleClose() {
    reset()
    setSelectedApplication(null)
    setSelectedParticipants([])
    setAppQuery('')
    onClose()
  }

  function onSubmit(values: InterviewFormValues) {
    if (!selectedApplication) return
    createMutation.mutate({
      application: selectedApplication.id,
      scheduled_date: new Date(values.scheduled_date).toISOString(),
      meeting_link: values.meeting_link,
      participant_ids: selectedParticipants.map((p) => p.id),
    })
  }

  function toggleParticipant(user: User) {
    setSelectedParticipants((prev) =>
      prev.some((p) => p.id === user.id) ? prev.filter((p) => p.id !== user.id) : [...prev, user]
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Schedule Interview" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Application</label>
          {selectedApplication ? (
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-900">
                {selectedApplication.candidate_name} — {selectedApplication.job_title}
              </span>
              <button type="button" onClick={() => setSelectedApplication(null)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by candidate or job title..."
                value={appQuery}
                onChange={(e) => setAppQuery(e.target.value)}
              />
              {debouncedAppQuery.length > 0 && appResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {appResults.map((app) => (
                    <button
                      type="button"
                      key={app.id}
                      onClick={() => { setSelectedApplication(app); setAppQuery('') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {app.candidate_name} — {app.job_title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Input label="Date & Time" type="datetime-local" error={errors.scheduled_date?.message} {...register('scheduled_date')} />
        <Input label="Meeting Link" placeholder="https://meet.google.com/..." error={errors.meeting_link?.message} {...register('meeting_link')} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Participants</label>
          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedParticipants.some((p) => p.id === user.id)}
                  onChange={() => toggleParticipant(user)}
                />
                {user.first_name} {user.last_name}
              </label>
            ))}
          </div>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">Couldn't schedule this interview. Check the fields and try again.</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={!selectedApplication} loading={createMutation.isPending}>
            Schedule Interview
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function InterviewsPage() {
  const { canManage } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [page, setPage] = useState(1)

  const interviewsQuery = useQuery({
    queryKey: ['interviews', page],
    queryFn: () => interviewsApi.list({ page }),
  })

  const interviews = interviewsQuery.data?.data.results ?? []
  const hasNext = !!interviewsQuery.data?.data.next
  const hasPrev = !!interviewsQuery.data?.data.previous

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Interviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage upcoming technical and cultural screenings.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Schedule Interview
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {interviewsQuery.isLoading ? (
          <PageSpinner />
        ) : interviewsQuery.isError ? (
          <EmptyState title="Couldn't load interviews" description="Something went wrong. Try refreshing the page." />
        ) : interviews.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="w-10 h-10" />}
            title="No interviews scheduled"
            description={canManage ? 'Schedule your first interview to get started.' : 'Check back later.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date / Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Participants</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{interview.application.candidate_name}</td>
                    <td className="px-4 py-3 text-gray-600">{interview.application.job_title}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(interview.scheduled_date).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="indigo">
                        <UsersIcon className="w-3 h-3 mr-1 inline" />
                        {interview.participant_count}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/interviews/${interview.id}`} className="text-blue-700 hover:underline text-sm font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(hasNext || hasPrev) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <ScheduleInterviewModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}