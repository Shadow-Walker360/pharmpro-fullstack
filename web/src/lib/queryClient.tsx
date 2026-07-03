import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          30_000,     // data fresh for 30s
      gcTime:             5 * 60_000, // garbage collect after 5min
      retry:              2,
      refetchOnWindowFocus: false,    // don't refetch on tab switch
    },
    mutations: {
      retry: 0,
    },
  },
})