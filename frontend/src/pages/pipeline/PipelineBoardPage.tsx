import { useState } from 'react'
import type { DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '../../api/applications'
import { useAuth } from '../../hooks/useAuth'
import { PageSpinner, EmptyState, AIScoreBadge } from '../../components/ui'
import type { ApplicationList } from '../../types'

async function fetchAllApplications(): Promise<ApplicationList[]> {
  let page = 1
  let results: ApplicationList[] = []
  while (true) {
    const res = await applicationsApi.list({ page })
    results = results.concat(res.data.results)
    if (!res.data.next) break
    page += 1
  }
  return results
}

function ApplicationCard({
  app,
  draggable,
  onDragStart,
}: {
  app: ApplicationList
  draggable: boolean
  onDragStart: (e: DragEvent, id: number) => void
}) {
  return (
    <Link
      to={`/applications/${app.id}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, app.id)}
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
    >
      <p className="text-sm font-medium text-gray-900">{app.candidate_name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{app.job_title}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          {new Date(app.applied_date).toLocaleDateString()}
        </span>
        <AIScoreBadge score={app.ai_match_score} />
      </div>
    </Link>
  )
}

export default function PipelineBoardPage() {
  const { canManage } = useAuth()
  const queryClient = useQueryClient()
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverStatusId, setDragOverStatusId] = useState<number | null>(null)

  const statusesQuery = useQuery({
    queryKey: ['statuses'],
    queryFn: () => applicationsApi.listStatuses(),
    staleTime: 10 * 60 * 1000,
  })

  const applicationsQuery = useQuery({
    queryKey: ['applications', 'all-for-pipeline'],
    queryFn: fetchAllApplications,
  })

  const moveStatusMutation = useMutation({
    mutationFn: ({ id, statusId }: { id: number; statusId: number }) =>
      applicationsApi.moveStatus(id, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'all-for-pipeline'] })
    },
  })

  if (statusesQuery.isLoading || applicationsQuery.isLoading) return <PageSpinner />

  if (statusesQuery.isError || applicationsQuery.isError) {
    return (
      <EmptyState
        title="Couldn't load the pipeline"
        description="Something went wrong. Try refreshing the page."
      />
    )
  }

  const statuses = [...(statusesQuery.data?.data.results ?? [])].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )
  const applications = applicationsQuery.data ?? []

  const grouped = new Map<number, ApplicationList[]>()
  statuses.forEach((s) => grouped.set(s.id, []))
  applications.forEach((app) => {
    if (app.current_status) {
      grouped.get(app.current_status.id)?.push(app)
    }
  })

  function handleDragStart(e: DragEvent, id: number) {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(statusId: number) {
    if (draggedId !== null) {
      moveStatusMutation.mutate({ id: draggedId, statusId })
    }
    setDraggedId(null)
    setDragOverStatusId(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {canManage
            ? 'Drag a candidate card to move them to a new stage.'
            : 'View-only — only HR/Admin can move candidates between stages.'}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => {
          const apps = grouped.get(status.id) ?? []
          const isDragTarget = dragOverStatusId === status.id
          return (
            <div
              key={status.id}
              className="flex-shrink-0 w-72"
              onDragOver={(e) => {
                if (!canManage) return
                e.preventDefault()
                setDragOverStatusId(status.id)
              }}
              onDragLeave={() => setDragOverStatusId(null)}
              onDrop={() => canManage && handleDrop(status.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-700">{status.status_name}</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {apps.length}
                </span>
              </div>
              <div
                className={`space-y-2 min-h-[100px] rounded-lg p-2 transition-colors ${
                  isDragTarget ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'
                }`}
              >
                {apps.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No candidates</p>
                ) : (
                  apps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      draggable={canManage}
                      onDragStart={handleDragStart}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}