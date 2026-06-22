import { useEffect, useRef, useState } from 'react'
import { candidateAuthApi } from '../api/candidateAuth'
import type { TaskStatusResponse } from '../types'

export function useTaskPoller(taskId: string | null) {
  const [status, setStatus] = useState<TaskStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!taskId) {
      setStatus(null)
      setError(null)
      return
    }

    let cancelled = false

    async function poll() {
      try {
        const { data } = await candidateAuthApi.getTaskStatus(taskId as string)
        if (cancelled) return
        setStatus(data)
        if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        if (cancelled) return
        setError('Lost connection while checking your application status.')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [taskId])

  return { status, error }
}