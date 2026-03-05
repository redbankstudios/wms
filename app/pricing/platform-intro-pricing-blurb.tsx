"use client"

import { ChevronRight, ShieldCheck } from "lucide-react"
import Link from "next/link"

export function PlatformIntroPricingBlurb({ variant = "default" }: { variant?: "compact" | "default" }) {
  const compact = variant === "compact"

  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing model</p>
          <h3 className={`mt-1 font-semibold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>Subscription + usage</h3>
        </div>
        <ShieldCheck className="h-5 w-5 text-slate-400" />
      </div>
      <p className={`mt-2 text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>
        Your monthly bill combines a platform subscription with included stops for delivery operations. Each plan includes a stop allowance,
        and overages are transparent at $0.08 per extra stop. Usage and invoice details are visible in billing so teams can track storage,
        pick/pack, and route costs in one place.
      </p>
      <Link
        href="/pricing"
        className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        View Pricing
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}
