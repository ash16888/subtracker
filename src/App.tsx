import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from './lib/react-query'
import { AuthProvider } from './features/auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './routes'
import { loadGoogleApis } from './services/googleAuthLoader'

function App() {
  useEffect(() => {
    // Загружаем Google Identity Services при старте приложения
    loadGoogleApis().catch(console.error)
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App