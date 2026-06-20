import axiosInstance from './axiosInstance'
import type {
  InterviewList,
  InterviewDetail,
  InterviewWritePayload,
  Evaluation,
  PaginatedResponse,
} from '../types'

export const interviewsApi = {
  list: (params?: { application?: number; page?: number }) =>
    axiosInstance.get<PaginatedResponse<InterviewList>>('/interviews/', { params }),

  get: (id: number) =>
    axiosInstance.get<InterviewDetail>(`/interviews/${id}/`),

  create: (data: InterviewWritePayload) =>
    axiosInstance.post<InterviewDetail>('/interviews/', data),

  update: (id: number, data: Partial<InterviewWritePayload>) =>
    axiosInstance.patch<InterviewDetail>(`/interviews/${id}/`, data),

  addParticipant: (id: number, userId: number) =>
    axiosInstance.post(`/interviews/${id}/add-participant/`, { user_id: userId }),

  listEvaluations: (interviewId: number) =>
    axiosInstance.get<PaginatedResponse<Evaluation>>('/evaluations/', {
      params: { interview: interviewId },
    }),

  submitEvaluation: (data: {
    interview: number
    score: number
    written_feedback: string
  }) => axiosInstance.post<Evaluation>('/evaluations/', data),
}
