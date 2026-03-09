/**
 * Minimal Login Page — Phase 1 Security Foundation
 *
 * Uses Supabase email + password auth (the simplest production-safe option).
 *
 * ASSUMPTIONS / INCOMPLETE ITEMS (Phase 1):
 * - User accounts in Supabase Auth must be manually created via the Supabase dashboard
 *   or a future invite/onboarding flow (not built yet).
 * - The `users` table must have a `supabase_auth_id` column to link auth users to
 *   WMS user profiles. (Migration: 20260308000001_add_supabase_auth_id.sql)
 * - After login, the user is redirected to '/' where the existing demo shell runs.
 *   The DemoContext will still control tenant/role switching in dev mode.
 * - Magic link / OAuth / SSO can be added later without changing this page's structure.
 *
 * TODO (Phase 1.5):
 * - Replace DemoContext tenant/role switching with session-derived values
 * - Add forgot password flow
 * - Add tenant invite / onboarding registration
 */
"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            WMS & Delivery
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Dev mode note */}
        {process.env.NODE_ENV === "development" && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-600">
            Development mode — the app shell is also accessible at{" "}
            <a href="/" className="underline hover:text-slate-600 dark:hover:text-slate-400">
              /
            </a>{" "}
            without login.
          </p>
        )}
      </div>
    </div>
  )
}
