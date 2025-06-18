import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { Layout } from '../components/Layout'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { SettingsPage } from '../pages/SettingsPage'
import { DemoAIInsightsPage } from '../pages/DemoAIInsightsPage'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/demo" element={<DemoAIInsightsPage />} />
      <Route
        path="/"
        element={
          user ? (
            <Layout>
              <DashboardPage />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/settings"
        element={
          user ? (
            <Layout>
              <SettingsPage />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  )
}