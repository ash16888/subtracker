import { renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthProvider } from './AuthContext'
import { createMockUser, createMockSession } from '../../test/test-utils'

describe('useAuth behavior', () => {
  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('should return auth context when used within AuthProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialLoading={false}>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.signInWithGoogle).toBeInstanceOf(Function)
    expect(result.current.signOut).toBeInstanceOf(Function)
    expect(result.current.reauthorizeGoogle).toBeInstanceOf(Function)
  })

  it('should return user when authenticated', () => {
    const mockUser = createMockUser({ email: 'test@example.com' })
    const mockSession = createMockSession()

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider 
        initialUser={mockUser} 
        initialSession={mockSession}
        initialLoading={false}
      >
        {children}
      </AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.session).toEqual(mockSession)
    expect(result.current.loading).toBe(false)
  })

  it('should handle null user state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider 
        initialUser={null} 
        initialSession={null}
        initialLoading={false}
      >
        {children}
      </AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('should indicate loading state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialLoading={true}>
        {children}
      </AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)
  })

  it('should provide Google user metadata correctly', () => {
    const mockUser = createMockUser({
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
      user_metadata: {
        name: 'John Doe',
        picture: 'https://example.com/avatar.jpg',
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider 
        initialUser={mockUser}
        initialLoading={false}
      >
        {children}
      </AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user?.app_metadata?.provider).toBe('google')
    expect(result.current.user?.user_metadata?.name).toBe('John Doe')
    expect(result.current.user?.user_metadata?.picture).toBe('https://example.com/avatar.jpg')
  })
})