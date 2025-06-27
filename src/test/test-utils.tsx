import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import type { User, Session } from '@supabase/supabase-js'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: User | null
  session?: Session | null
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

function AllTheProviders({ 
  children, 
  user = null, 
  session = null 
}: { 
  children: React.ReactNode
  user?: User | null
  session?: Session | null
}) {
  const testQueryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        <AuthProvider 
          initialUser={user} 
          initialSession={session}
          initialLoading={false}
        >
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { user, session, ...renderOptions } = options

  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} user={user} session={session} />
    ),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {
    provider: 'google',
    providers: ['google'],
  },
  user_metadata: {
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  },
  identities: [],
  ...overrides,
})

export const createMockSession = (userOverrides: Partial<User> = {}): Session => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: createMockUser(userOverrides),
  provider_token: 'test-provider-token',
  provider_refresh_token: 'test-provider-refresh-token',
})