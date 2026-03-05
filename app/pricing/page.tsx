"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Map,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react"

type BillingCycle = "monthly" | "annual"
type PlanId = "starter" | "growth" | "scale" | "enterprise"
type RecommendationId = "starter" | "growth" | "scale" | "usage" | "enterprise"

type Plan = {
  id: PlanId
  name: string
  monthlyPrice: number | null
  includedStops: number | null
  cta: string
  popular?: boolean
  description: string
  features: string[]
}

const OVERAGE_PER_STOP = 0.08
const USAGE_DELIVERY_STOP_RATE = 0.12
const USAGE_STORAGE_UNIT_RATE = 0.18
const ANNUAL_DISCOUNT_FACTOR = 10 / 12 // 2 months free

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 499,
    includedStops: 5_000,
    cta: "Start free trial",
    description: "For early-stage operations launching one warehouse + delivery flow.",
    features: [
      "Multi-tenant workspace with role-based access",
      "Receiving and putaway workflows",
      "Inventory visibility by SKU and location",
      "Pick/pack task management",
      "Shipment management",
      "Basic route planning and dispatch",
      "Driver app with proof of delivery",
      "Standard reports and invoice visibility",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 1_499,
    includedStops: 25_000,
    cta: "Book a demo",
    popular: true,
    description: "For scaling 3PL and distribution teams with heavier stop volume.",
    features: [
      "Everything in Starter",
      "Advanced routing + dispatch workflows",
      "Mapbox-based live route visibility",
      "Driver mobile flow with signature/photo/timestamp/GPS POD",
      "Returns initiation, inspection, and disposition",
      "Storage + pick/pack + stop-based billing views",
      "Analytics dashboards for throughput and SLA",
      "Shopify webhooks for order creation and inventory events",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 3_999,
    includedStops: 100_000,
    cta: "Book a demo",
    description: "For multi-site operations that need high-volume execution and control.",
    features: [
      "Everything in Growth",
      "High-volume dispatch and queue orchestration",
      "Expanded analytics and billing controls",
      "Cross-tenant operational insights",
      "Configurable workflow governance",
      "Extended API + webhook capacity",
      "Advanced onboarding and implementation support",
      "Quarterly architecture and optimization reviews",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    includedStops: null,
    cta: "Talk to sales",
    description: "For enterprise networks requiring custom contracts and controls.",
    features: [
      "Custom stop volume and pricing contract",
      "Dedicated success and support channels",
      "SLA-backed uptime and response times",
      "SSO and advanced security controls",
      "Dedicated implementation team",
      "Custom integration and data migration planning",
      "Executive reporting and governance cadence",
      "Optional dedicated environment",
    ],
  },
]

const comparisonRows = [
  { label: "Multi-tenant + roles", starter: true, growth: true, scale: true, enterprise: true },
  { label: "Receiving / Putaway", starter: true, growth: true, scale: true, enterprise: true },
  { label: "Pick / Pack tasks", starter: true, growth: true, scale: true, enterprise: true },
  { label: "Shipping labels & shipments", starter: true, growth: true, scale: true, enterprise: true },
  { label: "Route planning & dispatch", starter: "Basic", growth: "Advanced", scale: "Advanced", enterprise: "Advanced + custom" },
  { label: "Driver mobile app + POD", starter: true, growth: true, scale: true, enterprise: true },
  { label: "Returns management", starter: "Basic", growth: true, scale: true, enterprise: true },
  { label: "Analytics & reports", starter: "Core", growth: "Advanced", scale: "Advanced", enterprise: "Executive" },
  { label: "API + webhooks (Shopify)", starter: "Limited", growth: true, scale: true, enterprise: true },
  { label: "SLA / SSO / Dedicated support", starter: false, growth: false, scale: false, enterprise: true },
] as const

const faqItems = [
  {
    q: "What counts as a stop?",
    a: "A stop is one delivery destination visited by a driver on a route. A single route with 40 unique destinations equals 40 stops.",
  },
  {
    q: "What is a storage unit in usage-based pricing?",
    a: "One storage unit equals one pallet position per month. Storage usage is metered and visible in Billing and Usage reporting.",
  },
  {
    q: "Do you charge per warehouse or per user?",
    a: "Core pricing is subscription plus stop usage, or usage-based delivery + storage. We do not charge by seat in standard plans.",
  },
  {
    q: "What happens if we go over included stops?",
    a: "Overages are billed transparently at $0.08 per stop beyond your plan's included monthly stop volume.",
  },
  {
    q: "Can we bring our own drivers?",
    a: "Yes. You can use your own drivers and fleet while managing dispatch, route execution, and POD in the platform.",
  },
  {
    q: "Do you integrate with Shopify?",
    a: "Yes. Shopify webhooks are supported for order creation and inventory event syncing.",
  },
  {
    q: "Is there onboarding help?",
    a: "Yes. Every plan includes onboarding guidance, with deeper implementation and rollout support in Scale and Enterprise.",
  },
  {
    q: "Can we start with WMS only and add delivery later?",
    a: "Yes. You can start with warehouse execution workflows and add route planning, dispatch, and driver operations as your rollout expands.",
  },
  {
    q: "Is our data isolated per tenant?",
    a: "Yes. The platform is multi-tenant with strong data isolation controls and row-level security (RLS) patterns.",
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function getDisplayedPrice(plan: Plan, billingCycle: BillingCycle) {
  if (plan.monthlyPrice === null) return "Talk to sales"
  if (billingCycle === "monthly") return `${formatCurrency(plan.monthlyPrice)}/mo`
  const discountedMonthly = Math.round(plan.monthlyPrice * ANNUAL_DISCOUNT_FACTOR)
  return `${formatCurrency(discountedMonthly)}/mo`
}

function getAnnualBilled(plan: Plan) {
  if (plan.monthlyPrice === null) return null
  return plan.monthlyPrice * 10
}

function getEffectiveMonthly(plan: Plan, billingCycle: BillingCycle) {
  if (plan.monthlyPrice === null) return 0
  return billingCycle === "monthly"
    ? plan.monthlyPrice
    : Math.round(plan.monthlyPrice * ANNUAL_DISCOUNT_FACTOR)
}

function computePlanTotal(plan: Plan, stops: number, billingCycle: BillingCycle) {
  if (plan.monthlyPrice === null || plan.includedStops === null) {
    return {
      base: 0,
      overageStops: 0,
      overage: 0,
      total: Number.POSITIVE_INFINITY,
    }
  }
  const base = getEffectiveMonthly(plan, billingCycle)
  const overageStops = Math.max(0, stops - plan.includedStops)
  const overage = overageStops * OVERAGE_PER_STOP
  return {
    base,
    overageStops,
    overage,
    total: base + overage,
  }
}

function cellValue(value: boolean | string) {
  if (typeof value === "string") return <span className="text-xs font-medium text-slate-700">{value}</span>
  if (value) return <Check className="h-4 w-4 text-emerald-600" aria-label="Included" />
  return <span className="text-xs text-slate-400">-</span>
}

function PlatformIntroPricingBlurb({ variant = "default" }: { variant?: "compact" | "default" }) {
  const compact = variant === "compact"

  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing model</p>
          <h3 className={`mt-1 font-semibold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>Subscription or usage-based</h3>
        </div>
        <ShieldCheck className="h-5 w-5 text-slate-400" />
      </div>
      <p className={`mt-2 text-slate-600 ${compact ? "text-xs" : "text-sm"}`}>
        Choose a subscription plan with included stops and predictable monthly pricing, or start on our free platform plan billed by delivery and storage usage.
        Subscription plans include stop allowances with transparent $0.08 overage per extra stop.
        Usage-based pricing has a $0 platform fee, with metered charges for stops and storage units.
        Billing and usage views show the full breakdown so warehouse admins can track cost drivers clearly.
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

function PricingCard({ plan, billingCycle }: { plan: Plan; billingCycle: BillingCycle }) {
  return (
    <article
      id={`plan-${plan.id}`}
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        plan.popular ? "border-slate-900" : "border-slate-200"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-bold text-slate-900">{getDisplayedPrice(plan, billingCycle)}</p>
        {billingCycle === "annual" && plan.monthlyPrice !== null && (
          <p className="mt-1 text-xs text-slate-500">Billed annually at {formatCurrency(getAnnualBilled(plan) ?? 0)}/year</p>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Included stops</p>
        <p className="mt-1 text-base font-semibold text-slate-900">
          {plan.includedStops ? `${plan.includedStops.toLocaleString()}/month` : "Custom stop volume"}
        </p>
        <p className="mt-1 text-xs text-slate-600">Extra stops beyond plan: $0.08/stop</p>
      </div>

      <ul className="mt-5 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-2">
        <Link
          href={plan.id === "starter" ? "/pricing#trial" : "/pricing#demo"}
          className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
            plan.popular ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-300 text-slate-800 hover:bg-slate-50"
          }`}
        >
          {plan.cta}
        </Link>
      </div>
    </article>
  )
}

function UsageBasedPlanCard() {
  return (
    <article id="plan-usage" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage-Based Plan</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">$0 / month platform fee</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Free platform access does not mean free operations. Delivery and storage are billed by actual monthly usage.
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Start free</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery usage</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${USAGE_DELIVERY_STOP_RATE.toFixed(2)} per stop</p>
          <p className="mt-1 text-xs text-slate-600">A stop is one delivery destination visited by a driver.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Storage usage</p>
          <p className="mt-1 text-xl font-bold text-slate-900">${USAGE_STORAGE_UNIT_RATE.toFixed(2)} per storage unit / month</p>
          <p className="mt-1 text-xs text-slate-600">Storage unit = one pallet position per month.</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-700">
        <strong>Best for:</strong> seasonal volume, new operations, or teams that want to start without a fixed platform fee.
      </p>
      <p className="mt-2 text-xs text-slate-500">Metering and charges are visible in Billing and Usage for full cost transparency.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Book demo
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Start free
        </Link>
      </div>
    </article>
  )
}

function SmartEstimator({ billingCycle }: { billingCycle: BillingCycle }) {
  const [monthlyStops, setMonthlyStops] = React.useState(12000)
  const [storageUnits, setStorageUnits] = React.useState(3500)
  const [showDetailedBreakdown, setShowDetailedBreakdown] = React.useState(true)

  const starterPlan = plans.find((p) => p.id === "starter")!
  const growthPlan = plans.find((p) => p.id === "growth")!
  const scalePlan = plans.find((p) => p.id === "scale")!

  const starter = React.useMemo(() => computePlanTotal(starterPlan, monthlyStops, billingCycle), [billingCycle, monthlyStops, starterPlan])
  const growth = React.useMemo(() => computePlanTotal(growthPlan, monthlyStops, billingCycle), [billingCycle, monthlyStops, growthPlan])
  const scale = React.useMemo(() => computePlanTotal(scalePlan, monthlyStops, billingCycle), [billingCycle, monthlyStops, scalePlan])

  const usageTotal = React.useMemo(
    () => monthlyStops * USAGE_DELIVERY_STOP_RATE + storageUnits * USAGE_STORAGE_UNIT_RATE,
    [monthlyStops, storageUnits]
  )

  const recommendation = React.useMemo(() => {
    let recommended: RecommendationId = "usage"
    let reason = "Lowest estimated monthly total based on your inputs"
    const reasons: string[] = []

    const totals: Record<RecommendationId, number> = {
      starter: starter.total,
      growth: growth.total,
      scale: scale.total,
      usage: usageTotal,
      enterprise: Number.POSITIVE_INFINITY,
    }

    if (monthlyStops > 100_000) {
      recommended = "scale"
      reason = "Based on very high stop volume, Scale gives the strongest included capacity before overages"
      reasons.push("Includes up to 100,000 stops before overages")
      if (monthlyStops > 130_000) {
        reasons.push("Your projected volume is high enough to discuss Enterprise pricing")
      }
    } else {
      const lowest = (Object.keys(totals) as RecommendationId[])
        .filter((id) => id !== "enterprise")
        .sort((a, b) => totals[a] - totals[b])[0]
      recommended = lowest
      reason = "Lowest estimated monthly total based on your inputs"

      if (recommended === "usage") {
        reasons.push("No platform fee; you only pay for delivery + storage usage")
      }
      if (recommended === "starter") {
        reasons.push("Includes up to 5,000 stops before overages")
      }
      if (recommended === "growth") {
        reasons.push("Includes up to 25,000 stops before overages")
      }
      if (recommended === "scale") {
        reasons.push("Includes up to 100,000 stops before overages")
      }
    }

    return {
      id: recommended,
      planName:
        recommended === "usage"
          ? "Usage-Based Plan"
          : `${recommended.charAt(0).toUpperCase()}${recommended.slice(1)} Plan`,
      reason,
      reasons,
      anchor:
        recommended === "usage"
          ? "plan-usage"
          : `plan-${recommended}`,
    }
  }, [growth.total, monthlyStops, scale.total, starter.total, usageTotal])

  const upgradePrompts = React.useMemo(() => {
    const prompts: string[] = []

    if (monthlyStops > 5_000) {
      prompts.push("You're over Starter's included stops. Growth may reduce overage costs.")
    }
    if (monthlyStops > 25_000) {
      prompts.push("You're over Growth's included stops. Scale may reduce overage costs.")
    }
    if (monthlyStops > 100_000) {
      prompts.push("You're over Scale's included stops. Talk to us about Enterprise pricing.")
    }

    if (usageTotal > growth.total && monthlyStops >= 8_000 && monthlyStops <= 100_000) {
      prompts.push("At your volume, a subscription plan is likely better value. Recommended: Growth or Scale.")
    }

    if (monthlyStops >= Math.floor(5_000 * 0.9) && monthlyStops <= 5_000) {
      prompts.push("You're close to Starter's limit. Consider Growth to reduce overage risk.")
    }
    if (monthlyStops >= Math.floor(25_000 * 0.9) && monthlyStops <= 25_000) {
      prompts.push("You're close to Growth's limit. Consider Scale to keep costs predictable.")
    }
    if (monthlyStops >= Math.floor(100_000 * 0.9) && monthlyStops <= 100_000) {
      prompts.push("You're close to Scale's limit. Consider an Enterprise discussion for upcoming growth.")
    }

    return prompts.slice(0, 3)
  }, [growth.total, monthlyStops, usageTotal])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6" id="estimator">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Smart Estimator</h2>
          <p className="text-sm text-slate-600">
            Compare subscription tiers and usage-based pricing. Stop = one delivery destination. Storage unit = one pallet position per month.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Transparent metering</span>
      </div>

      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Recommended: {recommendation.planName}</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-emerald-800">
          <li>{recommendation.reason}</li>
          {recommendation.reasons.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => scrollToId(recommendation.anchor)}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          See recommended plan
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor="monthlyStops">
            Monthly delivery stops
          </label>
          <input
            id="monthlyStops"
            type="number"
            min={0}
            value={monthlyStops}
            onChange={(e) => setMonthlyStops(Number(e.target.value || 0))}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />

          <label className="block text-sm font-medium text-slate-700" htmlFor="storageUnits">
            Monthly storage units (pallet positions)
          </label>
          <input
            id="storageUnits"
            type="number"
            min={0}
            value={storageUnits}
            onChange={(e) => setStorageUnits(Number(e.target.value || 0))}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showDetailedBreakdown}
              onChange={(e) => setShowDetailedBreakdown(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            Show detailed breakdown
          </label>

          {upgradePrompts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Upgrade suggestions</p>
              <ul className="mt-2 list-disc pl-5">
                {upgradePrompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Starter</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(starter.total)}</p>
            </div>
            {showDetailedBreakdown && (
              <p className="mt-1 text-xs text-slate-600">
                Subscription {formatCurrency(starter.base)} + overage {starter.overageStops.toLocaleString()} x $0.08 = {formatCurrency(starter.overage)}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Growth</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(growth.total)}</p>
            </div>
            {showDetailedBreakdown && (
              <p className="mt-1 text-xs text-slate-600">
                Subscription {formatCurrency(growth.base)} + overage {growth.overageStops.toLocaleString()} x $0.08 = {formatCurrency(growth.overage)}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Scale</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(scale.total)}</p>
            </div>
            {showDetailedBreakdown && (
              <p className="mt-1 text-xs text-slate-600">
                Subscription {formatCurrency(scale.base)} + overage {scale.overageStops.toLocaleString()} x $0.08 = {formatCurrency(scale.overage)}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-900">Usage-Based</p>
              <p className="text-sm font-bold text-emerald-900">{formatCurrency(usageTotal)}</p>
            </div>
            {showDetailedBreakdown && (
              <p className="mt-1 text-xs text-emerald-800">
                Delivery {monthlyStops.toLocaleString()} x ${USAGE_DELIVERY_STOP_RATE.toFixed(2)} + storage {storageUnits.toLocaleString()} x ${USAGE_STORAGE_UNIT_RATE.toFixed(2)}
              </p>
            )}
          </div>

          {billingCycle === "annual" && (
            <p className="text-xs text-slate-500">
              Annual mode shows effective monthly subscription pricing (2 months free equivalent). Usage-based charges remain metered by monthly activity.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("monthly")

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            WMS + Last-Mile Delivery Pricing
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Warehouse + Delivery, priced for growth</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Simple pricing: platform subscription for your operations stack plus transparent usage billing based on monthly delivery stops.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Transparent usage pricing
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <Building2 className="h-4 w-4 text-emerald-600" /> Built for multi-warehouse teams
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <Map className="h-4 w-4 text-emerald-600" /> Real-time delivery visibility
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3" id="demo">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Book a demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              id="trial"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                billingCycle === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Show monthly pricing"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                billingCycle === "annual" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Show annual pricing"
            >
              Annual
            </button>
          </div>
          {billingCycle === "annual" && (
            <span className="ml-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">2 months free</span>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-2 lg:px-8 xl:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} billingCycle={billingCycle} />
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Prefer usage-based? Start free and pay as you go.</h2>
          <p className="mt-2 text-sm text-slate-600">
            You now have two ways to pay. Subscription plans provide predictable monthly pricing with included stops and low overage.
            Usage-based pricing starts at $0 platform fee and bills only for delivery stops and storage units consumed.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Free platform access does not include free delivery or storage. Metering is transparent in Billing and Usage.
          </p>
          <div className="mt-5">
            <UsageBasedPlanCard />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">How pricing works</h2>
          <p className="mt-2 text-sm text-slate-600">Your monthly total combines one platform fee model and transparent usage metering.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Choose model</p>
              <p className="mt-1 text-sm text-slate-600">Select subscription tiers for predictability, or usage-based for zero fixed platform fee.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Track included usage</p>
              <p className="mt-1 text-sm text-slate-600">Subscription plans include stops. Usage-based bills by stops and storage units.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Pay transparent overage or metered usage</p>
              <p className="mt-1 text-sm text-slate-600">Subscription overage is $0.08/stop. Usage-based is $0.12/stop + $0.18/storage unit.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Example A: 12,000 stops on Growth</p>
              <p className="mt-2 text-sm text-emerald-900">$1,499 subscription + no overage (inside 25,000 included stops) = <strong>$1,499 total</strong>.</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Example B: 30,000 stops on Growth</p>
              <p className="mt-2 text-sm text-amber-900">$1,499 subscription + (5,000 x $0.08) overage = $1,499 + $400 = <strong>$1,899 total</strong>.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Feature comparison</h2>
          <p className="mt-2 text-sm text-slate-600">End-to-end warehouse and delivery capabilities by plan.</p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-3 font-semibold text-slate-900">Capability</th>
                  <th className="px-3 py-3 font-semibold text-slate-900">Starter</th>
                  <th className="px-3 py-3 font-semibold text-slate-900">Growth</th>
                  <th className="px-3 py-3 font-semibold text-slate-900">Scale</th>
                  <th className="px-3 py-3 font-semibold text-slate-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-700">{row.label}</td>
                    <td className="px-3 py-3">{cellValue(row.starter)}</td>
                    <td className="px-3 py-3">{cellValue(row.growth)}</td>
                    <td className="px-3 py-3">{cellValue(row.scale)}</td>
                    <td className="px-3 py-3">{cellValue(row.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                <ClipboardList className="h-4 w-4" /> Warehouse execution
              </div>
              Receiving, putaway, inventory, pick/pack, and shipments.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                <Truck className="h-4 w-4" /> Delivery orchestration
              </div>
              Routing, dispatch, driver operations, and POD.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                <Package className="h-4 w-4" /> Returns + billing
              </div>
              Returns workflows plus invoice and usage tracking.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                <Map className="h-4 w-4" /> Integrations
              </div>
              API and Shopify webhooks for order and inventory events.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SmartEstimator billingCycle={billingCycle} />
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">FAQ</h2>
        <div className="mt-6 space-y-3">
          {faqItems.map((item) => (
            <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                <span className="inline-flex items-center gap-2">
                  {item.q}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:p-10">
          <h2 className="text-3xl font-bold tracking-tight">See how fast your warehouse can move</h2>
          <p className="mt-2 text-sm text-slate-300">From receiving to proof of delivery, get one platform to run operations with predictable pricing.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Book demo
            </Link>
            <Link href="/signup" className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Start trial
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">No hidden fees. Overage and usage are visible before invoicing.</p>
        </div>
      </section>
    </main>
  )
}
