import axiosInstance from './axiosInstance'

export interface DashboardStats {
  open_jobs: number
  applications_this_week: number
  avg_ai_match_score: number | null
  interviews_scheduled: number
  applications_by_status: { status: string; count: number }[]
}

export const dashboardApi = {
  getStats: () => axiosInstance.get<DashboardStats>('/dashboard/stats/'),
}
