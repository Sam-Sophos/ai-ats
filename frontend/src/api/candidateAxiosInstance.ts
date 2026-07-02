import axios, { AxiosError } from 'axios'

const candidateAxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor — inject candidate JWT access token ─────────────────
candidateAxiosInstance.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem('candidate-auth-storage')
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

candidateAxiosInstance.interceptors.response.use(
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
          return candidateAxiosInstance(originalRequest!)
        })
      }

      if (originalRequest) originalRequest._retry = true
      isRefreshing = true

      const raw = localStorage.getItem('candidate-auth-storage')
      let refreshToken: string | null = null
      if (raw) {
        try {
          refreshToken = JSON.parse(raw)?.state?.refreshToken
        } catch {
          // ignore
        }
      }

      if (!refreshToken) {
        localStorage.removeItem('candidate-auth-storage')
        window.location.href = '/careers/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/refresh/`, {
          refresh: refreshToken,
        })
        const newAccessToken = data.access

        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            parsed.state.accessToken = newAccessToken
            localStorage.setItem('candidate-auth-storage', JSON.stringify(parsed))
          } catch {
            // ignore
          }
        }

        processQueue(null, newAccessToken)

        if (originalRequest?.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        }
        return candidateAxiosInstance(originalRequest!)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        localStorage.removeItem('candidate-auth-storage')
        window.location.href = '/careers/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default candidateAxiosInstance