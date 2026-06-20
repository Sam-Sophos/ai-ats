import axiosInstance from './axiosInstance'
import type {
  ApplicationList,
  ApplicationDetail,
  PaginatedResponse,
  Status,
  StatusHistory,
  TaskStatusResponse,
} from '../types'

export const applicationsApi = {
  list: (params?: {
    job?: number
    candidate?: number
    ordering?: string
    page?: number
    search?: string
  }) =>
    axiosInstance.get<PaginatedResponse<ApplicationList>>('/applications/', { params }),

  get: (id: number) =>
    axiosInstance.get<ApplicationDetail>(`/applications/${id}/`),

  create: (formData: FormData) =>
    axiosInstance.post<ApplicationDetail>('/applications/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  moveStatus: (id: number, statusId: number) =>
    axiosInstance.patch<StatusHistory>(`/applications/${id}/move-status/`, {
      status_id: statusId,
    }),

  overrideScore: (id: number, score: number) =>
    axiosInstance.patch<{ ai_match_score: number; human_override_applied: boolean }>(
      `/applications/${id}/override-score/`,
      { ai_match_score: score }
    ),

  getResumeUrl: (id: number) => `/api/applications/${id}/resume/`,

  listStatuses: () =>
    axiosInstance.get<PaginatedResponse<Status>>('/statuses/'),

  getTaskStatus: (taskId: string) =>
    axiosInstance.get<TaskStatusResponse>(`/tasks/${taskId}/`),
}
