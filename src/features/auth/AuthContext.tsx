import { createContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  reauthorizeGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Проверяем сохраненную сессию
        const { data: { session: storedSession }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (error) {
            console.error('Error restoring session:', error)
            // Очищаем невалидную сессию
            await supabase.auth.signOut()
          } else if (storedSession) {
            // Проверяем, что сессия все еще валидна
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setSession(storedSession)
              setUser(user)
              console.log('Session restored successfully')
            } else {
              // Сессия невалидна
              console.log('Session invalid, signing out')
              await supabase.auth.signOut()
            }
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Подписываемся на изменения состояния авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (mounted) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          // Очищаем сохраненное время истечения токена
          localStorage.removeItem('subtracker-token-expires')
        } else if (event === 'USER_UPDATED') {
          setSession(session)
          setUser(session?.user ?? null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])


  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    if (error) throw error
  }

  const reauthorizeGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, reauthorizeGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}