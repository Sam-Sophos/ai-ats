import axiosInstance from './axiosInstance'
import type { Candidate, CandidateWritePayload, PaginatedResponse } from '../types'

export const candidatesApi = {
  list: (params?: { search?: string; page?: number }) =>
    axiosInstance.get<PaginatedResponse<Candidate>>('/candidates/', { params }),

  get: (id: number) =>
    axiosInstance.get<Candidate>(`/candidates/${id}/`),

  create: (data: CandidateWritePayload) =>
    axiosInstance.post<Candidate>('/candidates/', data),

  update: (id: number, data: Partial<CandidateWritePayload>) =>
    axiosInstance.patch<Candidate>(`/candidates/${id}/`, data),
}
