/**
 * AuthContext — Phase 1 Security Foundation
 *
 * Provides Supabase auth session state to the React tree.
 * Coexists with DemoContext (which handles tenant/role selection in dev mode).
 *
 * Phase 1 behavior:
 *   - Listens to Supabase auth state changes (login/logout)
 *   - Exposes the authenticated Supabase user (null if not logged in)
 *   - The app continues to function without a session (DemoContext handles UX)
 *   - API route handlers enforce auth independently
 *
 * Phase 1.5 plan:
 *   - Replace DemoContext's role/tenant switching with values derived from
 *     the WMS `users` row fetched for the authenticated user
 *   - Add signOut helper that clears both Supabase session and app state
 *   - Add loading state to block render until auth is confirmed
 */
"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { type User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  /** The authenticated Supabase user, or null if not logged in */
  authUser: User | null
  /** True during initial session hydration */
  authLoading: boolean
  /** Sign out the current user */
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Hydrate from existing session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      setAuthLoading(false)
    })

    // Subscribe to future auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setAuthUser(null)
  }

  return (
    <AuthContext.Provider value={{ authUser, authLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
