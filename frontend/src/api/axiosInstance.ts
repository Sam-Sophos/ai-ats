import axios, { AxiosError } from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor — inject JWT access token ───────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const token = parsed?.state?.accessToken
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
      } catch {
        // Malformed storage — ignore
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — silent token refresh on 401 ──────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (originalRequest?.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
          }
          return axiosInstance(originalRequest!)
        })
      }

      if (originalRequest) originalRequest._retry = true
      isRefreshing = true

      const raw = localStorage.getItem('auth-storage')
      let refreshToken: string | null = null
      if (raw) {
        try {
          refreshToken = JSON.parse(raw)?.state?.refreshToken
        } catch {
          // ignore
        }
      }

      if (!refreshToken) {
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post('/api/auth/refresh/', {
          refresh: refreshToken,
        })
        const newAccessToken = data.access

        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            parsed.state.accessToken = newAccessToken
            localStorage.setItem('auth-storage', JSON.stringify(parsed))
          } catch {
            // ignore
          }
        }

        processQueue(null, newAccessToken)

        if (originalRequest?.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        }
        return axiosInstance(originalRequest!)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
