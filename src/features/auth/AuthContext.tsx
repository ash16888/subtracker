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

type AuthProviderProps = {
  children: React.ReactNode
  initialUser?: User | null
  initialSession?: Session | null
  initialLoading?: boolean
}

export function AuthProvider({ 
  children, 
  initialUser = null, 
  initialSession = null, 
  initialLoading = true 
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [loading, setLoading] = useState(initialLoading)

  useEffect(() => {
    if (initialUser !== null || initialSession !== null || initialLoading === false) {
      return
    }

    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session: storedSession }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (error) {
            await supabase.auth.signOut()
          } else if (storedSession) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setSession(storedSession)
              setUser(user)
            } else {
              await supabase.auth.signOut()
            }
          }
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
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
  }, [initialUser, initialSession, initialLoading])


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
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
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