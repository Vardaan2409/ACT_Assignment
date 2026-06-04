import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'

// TanStack Query global client — single source of truth for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds — data is fresh for 30s before background refetch
      staleTime: 30 * 1000,
      // Cache time: 5 minutes — keep inactive data in cache
      gcTime: 5 * 60 * 1000,
      // Retry failed queries twice before showing error
      retry: 2,
      // Refetch on window focus for always-fresh data
      refetchOnWindowFocus: true,
    },
  },
})

// Export so sync client can invalidate from outside React tree
export { queryClient }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
