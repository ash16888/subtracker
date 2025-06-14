import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from './lib/react-query'
import { AuthProvider } from './features/auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './routes'

function App() {
  console.log('App component rendering')
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
          </BrowserRouter>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App