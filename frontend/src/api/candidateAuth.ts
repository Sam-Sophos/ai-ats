import candidateAxiosInstance from './candidateAxiosInstance'
import type {
  Candidate,
  CandidateLoginPayload,
  CandidateRegisterPayload,
  CandidateAuthResponse,
  ApplicationList,
  ApplicationDetail,
  TaskStatusResponse,
} from '../types'

export const candidateAuthApi = {
  register: (data: CandidateRegisterPayload) =>
    candidateAxiosInstance.post<CandidateAuthResponse>('/candidate-auth/register/', data),

  login: (data: CandidateLoginPayload) =>
    candidateAxiosInstance.post<CandidateAuthResponse>('/candidate-auth/login/', data),

  me: () =>
    candidateAxiosInstance.get<Candidate>('/candidate-auth/me/'),

  myApplications: () =>
    candidateAxiosInstance.get<ApplicationList[]>('/candidate-auth/my-applications/'),

  apply: (formData: FormData) =>
    candidateAxiosInstance.post<ApplicationDetail & { task_id: string }>('/candidate-auth/apply/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getTaskStatus: (taskId: string) =>
    candidateAxiosInstance.get<TaskStatusResponse>(`/tasks/${taskId}/`),
}