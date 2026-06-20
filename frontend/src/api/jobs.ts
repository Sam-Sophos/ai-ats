import axiosInstance from './axiosInstance'
import type { JobList, JobDetail, JobWritePayload, Skill, PaginatedResponse } from '../types'

export const jobsApi = {
  list: (params?: { search?: string; department?: number; page?: number }) =>
    axiosInstance.get<PaginatedResponse<JobList>>('/jobs/', { params }),

  get: (id: number) =>
    axiosInstance.get<JobDetail>(`/jobs/${id}/`),

  create: (data: JobWritePayload) =>
    axiosInstance.post<JobDetail>('/jobs/', data),

  update: (id: number, data: Partial<JobWritePayload>) =>
    axiosInstance.patch<JobDetail>(`/jobs/${id}/`, data),

  delete: (id: number) =>
    axiosInstance.delete(`/jobs/${id}/`),

  searchSkills: (search: string) =>
    axiosInstance.get<PaginatedResponse<Skill>>('/skills/', { params: { search } }),
}
