"use client"

import * as React from "react"
import Link from "next/link"
import { PlatformIntroPricingBlurb } from "@/app/pricing/platform-intro-pricing-blurb"
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
const ANNUAL_DISCOUNT_FACTOR = 10 / 12 // "2 months free"

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
    a: "A stop is a unique delivery destination attempted by a driver. Re-attempts to the same destination in the same run are not counted as additional planned stops unless they are dispatched as separate stop records.",
  },
  {
    q: "Do you charge per warehouse or per user?",
    a: "Core pricing is subscription plus stop usage. We do not charge by seat in these standard plans; warehouse count and user model can be tailored in Enterprise contracts.",
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
  {
    q: "Where do we see usage and invoices?",
    a: "Usage and billing are visible in the billing modules, including storage, pick/pack, and route stop fee breakdowns.",
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
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

function getRecommendedPlan(stops: number): Plan {
  if (stops <= 5_000) return plans[0]
  if (stops <= 25_000) return plans[1]
  if (stops <= 100_000) return plans[2]
  return plans[3]
}

function cellValue(value: boolean | string) {
  if (typeof value === "string") return <span className="text-xs font-medium text-slate-700">{value}</span>
  if (value) return <Check className="h-4 w-4 text-emerald-600" aria-label="Included" />
  return <span className="text-xs text-slate-400">-</span>
}

function PricingCard({ plan, billingCycle }: { plan: Plan; billingCycle: BillingCycle }) {
  return (
    <article
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

function UsageEstimator({ billingCycle }: { billingCycle: BillingCycle }) {
  const [monthlyStops, setMonthlyStops] = React.useState(12000)
  const [monthlyOrders, setMonthlyOrders] = React.useState(15000)
  const [includeOverage, setIncludeOverage] = React.useState(true)

  const recommendedPlan = React.useMemo(() => getRecommendedPlan(monthlyStops), [monthlyStops])

  const { base, overageStops, overageCost, monthlyTotal, annualTotal } = React.useMemo(() => {
    if (recommendedPlan.monthlyPrice === null || recommendedPlan.includedStops === null) {
      return { base: 0, overageStops: 0, overageCost: 0, monthlyTotal: 0, annualTotal: 0 }
    }

    const baseMonthly =
      billingCycle === "monthly"
        ? recommendedPlan.monthlyPrice
        : Math.round(recommendedPlan.monthlyPrice * ANNUAL_DISCOUNT_FACTOR)

    const extraStops = Math.max(0, monthlyStops - recommendedPlan.includedStops)
    const extraCost = includeOverage ? extraStops * OVERAGE_PER_STOP : 0
    const monthly = baseMonthly + extraCost

    return {
      base: baseMonthly,
      overageStops: extraStops,
      overageCost: extraCost,
      monthlyTotal: monthly,
      annualTotal: monthly * 12,
    }
  }, [billingCycle, includeOverage, monthlyStops, recommendedPlan])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6" id="estimator">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Usage Estimator</h2>
          <p className="text-sm text-slate-600">Estimate plan fit and monthly cost from projected stop volume.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">No hidden fees</span>
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

          <label className="block text-sm font-medium text-slate-700" htmlFor="monthlyOrders">
            Monthly orders (optional context)
          </label>
          <input
            id="monthlyOrders"
            type="number"
            min={0}
            value={monthlyOrders}
            onChange={(e) => setMonthlyOrders(Number(e.target.value || 0))}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          />

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeOverage}
              onChange={(e) => setIncludeOverage(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            Include overage estimate
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended tier</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{recommendedPlan.name}</p>
          <p className="mt-3 text-sm text-slate-600">Projected monthly orders: {monthlyOrders.toLocaleString()}</p>

          {recommendedPlan.monthlyPrice === null ? (
            <p className="mt-4 text-sm text-slate-700">Your projected volume is above standard tiers. Contact sales for a custom package.</p>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subscription ({billingCycle})</span>
                <span className="font-medium text-slate-900">{formatCurrency(base)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Included stops</span>
                <span className="font-medium text-slate-900">{recommendedPlan.includedStops?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Overage stops</span>
                <span className="font-medium text-slate-900">{overageStops.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Overage cost @ $0.08</span>
                <span className="font-medium text-slate-900">{formatCurrency(overageCost)}</span>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Estimated monthly total</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(monthlyTotal)}</span>
                </div>
                {billingCycle === "annual" && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Estimated annual total</span>
                    <span className="text-base font-bold text-slate-900">{formatCurrency(annualTotal)}</span>
                  </div>
                )}
              </div>
            </div>
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
        <PlatformIntroPricingBlurb variant="default" />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">How pricing works</h2>
          <p className="mt-2 text-sm text-slate-600">Your monthly total combines one platform fee and usage-based overage when needed.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Choose subscription tier</p>
              <p className="mt-1 text-sm text-slate-600">Pick Starter, Growth, Scale, or Enterprise based on throughput and support needs.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Use included monthly stops</p>
              <p className="mt-1 text-sm text-slate-600">Each plan includes a monthly stop allowance before overage applies.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
              <p className="mt-2 text-sm font-medium text-slate-900">Pay transparent overage</p>
              <p className="mt-1 text-sm text-slate-600">Extra stops are billed at $0.08/stop. No hidden billing multipliers.</p>
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
        <UsageEstimator billingCycle={billingCycle} />
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
