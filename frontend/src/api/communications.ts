import axiosInstance from './axiosInstance'
import type { MessageTemplate, CommunicationsLog, PaginatedResponse } from '../types'

export const communicationsApi = {
  listTemplates: (params?: { search?: string }) =>
    axiosInstance.get<PaginatedResponse<MessageTemplate>>('/templates/', { params }),

  getTemplate: (id: number) =>
    axiosInstance.get<MessageTemplate>(`/templates/${id}/`),

  createTemplate: (data: Omit<MessageTemplate, 'id'>) =>
    axiosInstance.post<MessageTemplate>('/templates/', data),

  updateTemplate: (id: number, data: Partial<Omit<MessageTemplate, 'id'>>) =>
    axiosInstance.patch<MessageTemplate>(`/templates/${id}/`, data),

  listLogs: (params?: { application?: number; page?: number }) =>
    axiosInstance.get<PaginatedResponse<CommunicationsLog>>('/communications/', { params }),

  send: (applicationId: number, templateId: number) =>
    axiosInstance.post<CommunicationsLog>('/communications/send/', {
      application_id: applicationId,
      template_id: templateId,
    }),
}
