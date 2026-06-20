import axiosInstance from './axiosInstance'
import type { LoginCredentials, LoginResponse, User, Role, Department } from '../types'

export const authApi = {
  login: (credentials: LoginCredentials) =>
    axiosInstance.post<LoginResponse>('/auth/login/', credentials),

  refresh: (refresh: string) =>
    axiosInstance.post<{ access: string }>('/auth/refresh/', { refresh }),

  me: () =>
    axiosInstance.get<User>('/auth/me/'),

  listUsers: () =>
    axiosInstance.get<User[]>('/auth/users/'),

  listRoles: () =>
    axiosInstance.get<Role[]>('/auth/roles/'),

  listDepartments: () =>
    axiosInstance.get<Department[]>('/auth/departments/'),
}
