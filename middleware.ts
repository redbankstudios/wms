/**
 * Next.js Middleware — Phase 1.5 Security
 *
 * Responsibilities:
 *   1. Refresh Supabase auth session cookies on every request (keeps JWTs valid)
 *   2. Route-level redirect guard (production only, or when NEXT_PUBLIC_FORCE_AUTH_REDIRECT=true)
 *
 * Auth redirect strategy:
 *   - PRODUCTION: unauthenticated requests to non-public routes redirect to /login.
 *   - DEVELOPMENT: redirect is skipped so the demo shell at "/" remains usable without
 *     a live Supabase Auth account. API routes enforce auth independently via resolveAuth().
 *   - To test the full login flow locally, set NEXT_PUBLIC_FORCE_AUTH_REDIRECT=true in .env.local.
 *
 * Public paths (never redirected): /login, /api/*
 */
import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login", "/api/"]

export async function middleware(request: NextRequest) {
  // Always refresh the session first so cookies stay valid
  const response = await updateSession(request)

  const isProd = process.env.NODE_ENV === "production"
  const forceRedirect = process.env.NEXT_PUBLIC_FORCE_AUTH_REDIRECT === "true"

  if (isProd || forceRedirect) {
    const { pathname } = request.nextUrl
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
    if (!isPublic) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            // setAll is a no-op here — session mutations are handled by updateSession above
            setAll: () => {},
          },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata)
     * - Public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
