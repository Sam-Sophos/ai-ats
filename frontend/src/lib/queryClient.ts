import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 seconds before data is considered stale
      retry: 1,                // retry failed requests once
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
