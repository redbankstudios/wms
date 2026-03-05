"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useDemo } from "@/context/DemoContext"
import {
  Building2,
  Compass,
  Layers,
  Network,
  Route,
  Shield,
  Sparkles,
  Timer,
  Handshake,
  TrendingUp,
  ShieldCheck,
  ArrowDownToLine,
  Package,
  ShoppingCart,
  ClipboardList,
  Undo2,
  BarChart3,
  CreditCard,
  Truck,
  Map,
  Send,
  Users,
  Smartphone,
  Globe,
  SendToBack,
  LayoutDashboard,
  CheckCircle,
} from "lucide-react"

// ── End-to-end flow steps ────────────────────────────────────────────────────

const FLOW_STEPS = [
  "Inbound",
  "Storage",
  "Inventory",
  "Orders",
  "Tasks",
  "Dispatch Queue",
  "Routes",
  "Driver App",
  "Tracking",
  "Client Reports",
  "Billing",
]

// ── Role overview ─────────────────────────────────────────────────────────────

const ROLES = [
  {
    role: "Platform Owner",
    description: "Full access to every module — tenant management, warehouse ops, dispatch, client portal views, billing, and reports.",
  },
  {
    role: "Business Owner",
    description: "Manages warehouse operations, dispatch coordination, client billing, and reporting. Cannot administer other tenants.",
  },
  {
    role: "Warehouse Manager",
    description: "Oversees inbound receiving, storage, inventory, order fulfillment, tasks, and returns. Access to operational reports.",
  },
  {
    role: "Shipping Manager",
    description: "Controls fleet management, dispatcher console, route planning, dispatch queue, and the driver roster.",
  },
  {
    role: "Warehouse Employee",
    description: "Processes inbound shipments, executes warehouse tasks, and uses the Worker App for picking and packing.",
  },
  {
    role: "Packer",
    description: "Focused on pack tasks and the Worker App. Simplified view for packing station operators.",
  },
  {
    role: "Driver",
    description: "Uses the Driver App to execute routes, navigate stops, and capture proof of delivery.",
  },
  {
    role: "Driver Dispatcher",
    description: "Manages dispatches, builds and monitors routes, and communicates with drivers via the messaging console.",
  },
  {
    role: "B2B Client",
    description: "Accesses a branded self-service portal for inventory visibility, outbound requests, reports, and billing.",
  },
  {
    role: "End Customer",
    description: "Tracks their delivery in real time via the public-facing tracking portal — no login required.",
  },
]

// ── Page groups ───────────────────────────────────────────────────────────────

const PAGE_GROUPS = [
  {
    title: "Platform & Admin",
    description: "Tools for platform operators to manage tenants, monitor the business, and handle billing.",
    icon: Building2,
    pages: [
      {
        label: "Tenants",
        icon: Building2,
        summary: "Manage every client account on the platform — plans (Basic / Pro / Enterprise), onboarding status, storage consumption, and order volume. Suspend, activate, or impersonate a tenant to troubleshoot their view directly.",
        connectsTo: "Tenant selection drives which data appears across all warehouse and delivery modules.",
      },
      {
        label: "Settings",
        icon: Shield,
        summary: "Configure platform-wide operational defaults including warehouse zones, fee structures, and notification rules.",
        connectsTo: "Settings apply globally across the warehouse, dispatch, and client portal experiences.",
      },
      {
        label: "Business Reports",
        icon: BarChart3,
        summary: "Full analytics dashboard for platform operators and business owners. Includes KPI cards (orders shipped MTD, on-time delivery %, return rate, storage utilization, avg pick time, gross margin), a storage utilization area chart with period selector (7D / 30D / 90D / 12M), employee productivity by pick and pack counts, a route performance donut chart, monthly return rate trends, inventory aging by age bucket, and per-client profitability with margin bars.",
        connectsTo: "Aggregates activity from every operational module — orders, tasks, routes, and inventory.",
      },
      {
        label: "Order Reports",
        icon: BarChart3,
        summary: "Dedicated reporting view for order performance. Visualizes daily order volume and order trends with selectable windows (7D / 30D) and vendor-level filtering, so teams can analyze throughput by client account and spot demand shifts quickly.",
        connectsTo: "Pulls live order data from Supabase and links directly to fulfillment and client performance analysis.",
      },
      {
        label: "Client Billing",
        icon: CreditCard,
        summary: "Tenant-level invoice management for platform operators. View current month usage broken down by service category (storage, pick & pack, routing fees) with visual progress bars. Review the full invoice history, download PDFs, manage payment methods, and process outstanding balances with one click.",
        connectsTo: "Pulls billing events from orders processed, storage occupied, and routes dispatched.",
      },
    ],
  },
  {
    title: "Warehouse Operations",
    description: "The complete inbound-to-outbound workflow for warehouse teams.",
    icon: Layers,
    pages: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        summary: "Daily operational command center for warehouse managers. Shows key real-time metrics — orders today, pending tasks, units in storage, and active routes — along with quick-action shortcuts and a recent activity feed across all modules.",
        connectsTo: "Pulls live counts from inbound, tasks, orders, and dispatch queues.",
      },
      {
        label: "Inbound",
        icon: ArrowDownToLine,
        summary: "Receive and process inbound shipments end-to-end. Capture ASN details, validate line items against purchase orders, record quantities received, and generate putaway tasks with zone and rack assignment suggestions based on available storage capacity.",
        connectsTo: "Feeds storage utilization and makes received items available in inventory.",
      },
      {
        label: "Storage",
        icon: Layers,
        summary: "Visual overview of all warehouse zones and rack positions. Track occupancy and capacity per zone, identify available pallet positions, and support space planning decisions. Helps managers balance load across the warehouse floor.",
        connectsTo: "Informs inventory location data and guides putaway task assignments.",
      },
      {
        label: "Inventory",
        icon: Package,
        summary: "Real-time stock ledger by SKU and location. Monitor on-hand quantities, view reorder status flags, filter by product category, and see exact storage location details down to rack and bin. Shared visibility with B2B clients through the client portal.",
        connectsTo: "Drives order allocation, reorder triggers, and client-facing inventory views.",
      },
      {
        label: "Orders",
        icon: ShoppingCart,
        summary: "End-to-end order fulfillment pipeline. Track every order through its lifecycle — pending → in fulfillment → shipped → delivered. Expand any order to see line items, fill rate, and a visual status stepper. Move packed orders directly to the dispatch queue from this screen.",
        connectsTo: "Creates pick/pack tasks and feeds the dispatch queue when orders are ready to ship.",
      },
      {
        label: "Tasks",
        icon: ClipboardList,
        summary: "Unified task board for all warehouse work. Task types include Receive, Putaway, Pick, Pack, and Return. Filter by type or priority (Urgent / High / Normal), start tasks inline, and mark them done. KPI cards at the top surface total, pending, in-progress, and completed counts at a glance.",
        connectsTo: "Reflects execution across inbound, picking, packing, and returns processing.",
      },
      {
        label: "Returns",
        icon: Undo2,
        summary: "Process customer returns through a structured intake, inspection, and disposition workflow. Dispositions include Restock, Quarantine, and Supplier Return. Tracks return reasons and links back to the originating order for full traceability.",
        connectsTo: "Updates inventory levels after disposition and feeds return rate metrics in reports.",
      },
    ],
  },
  {
    title: "Dispatch & Delivery",
    description: "Move outbound freight from the warehouse to customers with full visibility.",
    icon: Truck,
    pages: [
      {
        label: "Fleet",
        icon: Truck,
        summary: "Manage your vehicle roster. Track each vehicle's weight capacity, package limit, availability status, and compliance requirements. Fleet data constrains what the dispatch and route planner can assign.",
        connectsTo: "Constrains auto-assignment in Dispatch Queue and route capacity in the Dispatcher.",
      },
      {
        label: "Dispatcher",
        icon: Map,
        summary: "The operational hub for delivery management — a four-tab console. Live Map shows active route polylines and pulsing driver markers on a Mapbox map with numbered stop popups. Driver Roster lists all active drivers with current status. Exceptions flags unresolved delivery problems. Messages enables inline two-way communication with drivers, with read/replied status tracking and offline warnings.",
        connectsTo: "Consumes routes, drivers, and order data. Driver messages sync with the Driver App.",
      },
      {
        label: "Routes",
        icon: Route,
        summary: "Plan and monitor delivery routes with individual stops, ETAs, sequences, and completion progress. Each route is linked to a driver and vehicle. Route stops feed into the Driver App for turn-by-turn execution.",
        connectsTo: "Feeds Driver App execution and publishes progress to the Tracking Portal.",
      },
      {
        label: "Dispatch Queue",
        icon: Send,
        summary: "Queue of packed orders waiting to be dispatched. Automatically assigns the best-fit driver based on delivery zone match and vehicle capacity (weight and package count). Shows a live map with delivery zone circles and order pin locations. One click adds an order to an existing route or creates a new one.",
        connectsTo: "Takes signal from Orders (packed status) and assigns to drivers and routes.",
      },
      {
        label: "Drivers",
        icon: Users,
        summary: "Manage your driver roster with full CRUD. Each driver profile includes license details, contact info, assigned vehicle, and delivery zone coverage. A second tab manages the delivery zone definitions — named zones with configurable radius and geographic center.",
        connectsTo: "Driver profiles link fleet capacity to route assignment in the Dispatcher.",
      },
    ],
  },
  {
    title: "Client Portal (B2B)",
    description: "A branded self-service experience for your B2B clients to manage their inventory and shipments.",
    icon: SendToBack,
    pages: [
      {
        label: "Client Dashboard",
        icon: LayoutDashboard,
        summary: "High-level KPI overview from the B2B client's perspective. Shows active orders, current inventory levels, recent shipments, pending returns, and quick links to the most-used actions. Designed to give clients an at-a-glance health check of their operation.",
        connectsTo: "Reads from orders, inventory, and reports for the active tenant.",
      },
      {
        label: "Client Outbound",
        icon: SendToBack,
        summary: "Clients create outbound shipment requests directly — no back-and-forth emails. Select from their product catalog, enter quantities, specify delivery details, and submit for warehouse fulfillment. The request enters the warehouse order queue automatically.",
        connectsTo: "Creates orders that flow into the warehouse Orders module and Dispatch Queue.",
      },
      {
        label: "Client Products",
        icon: Package,
        summary: "Browse the client's full product catalog with real-time inventory positions. Clients can see stock on hand, reserved quantities, and storage locations — giving them confidence in what's available before creating outbound requests.",
        connectsTo: "Mirrors warehouse inventory data filtered to the client's SKUs.",
      },
      {
        label: "Client Billing",
        icon: CreditCard,
        summary: "Transparent, usage-based billing for B2B clients. Shows a current month usage breakdown with progress bars for storage (pallet positions), pick & pack (items processed), and routing (stops dispatched). Includes full invoice history with downloadable PDFs and payment method management.",
        connectsTo: "Billing events sourced from actual warehouse and delivery activity for that tenant.",
      },
      {
        label: "Client Reports",
        icon: BarChart3,
        summary: "Client-facing reporting across three tabs. Best Sellers ranks the client's top products by units shipped and revenue with trend indicators (↑/↓). Return Issues shows every return with reason, quantity, and warehouse disposition. Delivery Issues logs carrier exceptions — address errors, damages, lost packages — with open/resolved status.",
        connectsTo: "Summarises order, return, and delivery data scoped to the client's account.",
      },
    ],
  },
  {
    title: "Mobile & Field Views",
    description: "Execution tools built for warehouse floors, delivery vehicles, and end customers.",
    icon: Smartphone,
    pages: [
      {
        label: "Worker App",
        icon: Smartphone,
        summary: "A simplified, touch-friendly interface for warehouse staff. Operators see their assigned task queue, step through pick-to-light style workflows, confirm packs, and update task status — all without needing access to the full management console.",
        connectsTo: "Syncs task updates with the Tasks module and triggers inventory adjustments on completion.",
      },
      {
        label: "Driver App",
        icon: Smartphone,
        summary: "Mobile route execution for drivers. View the day's stop list, navigate stop-by-stop, capture proof of delivery (photo or signature), and update delivery status. Exception reporting — failed delivery, damaged goods — feeds directly into the Dispatcher's Exceptions tab.",
        connectsTo: "Publishes delivery progress to the Tracking Portal and Dispatcher console in real time.",
      },
      {
        label: "Tracking Portal",
        icon: Globe,
        summary: "A public-facing delivery status page for end customers — no login required. Shows the live delivery status, estimated arrival window, a map of the driver's current location, and a confirmation screen on successful delivery. Reduces inbound customer support calls.",
        connectsTo: "Shows status sourced from Routes and Driver App progress updates.",
      },
    ],
  },
]

// ── Value points ──────────────────────────────────────────────────────────────

const VALUE_POINTS = [
  {
    title: "Fewer handoffs, faster throughput",
    description:
      "One connected workflow links receiving, putaway, picking, packing, dispatch, and delivery. Less context switching means fewer errors and faster execution from dock to doorstep.",
    icon: Timer,
  },
  {
    title: "One source of truth for everyone",
    description:
      "Operators, dispatchers, drivers, and clients see the same order and inventory state. Updates propagate instantly across dashboards, driver apps, and client portals.",
    icon: Network,
  },
  {
    title: "Client confidence without extra work",
    description:
      "Customer tracking, driver status, and proof of delivery are built in. Clients get a self-service portal for inventory and orders — reducing support tickets and boosting retention.",
    icon: Handshake,
  },
  {
    title: "Operational visibility at every step",
    description:
      "Dashboards and reports surface bottlenecks, SLA risks, and inventory health so teams can act before issues compound. Every role sees what matters most to their work.",
    icon: TrendingUp,
  },
  {
    title: "Built for multi-tenant operations",
    description:
      "A multi-tenant architecture keeps each client's data isolated while enabling platform-wide administration, consolidated billing, and cross-client analytics.",
    icon: ShieldCheck,
  },
]

// ── Recent updates ───────────────────────────────────────────────────────────

const RECENT_UPDATES = [
  {
    title: "Tenant foundation established",
    description:
      "The core tenant data model is now in place, including plan tier, storage capacity, billing cycle, and account status so platform owners can manage multi-tenant operations with clarity.",
  },
  {
    title: "End-customer portal expanded",
    description:
      "The customer-facing tracking portal now supports delivery preferences, return requests, and post-delivery ratings, alongside a simple messaging thread for delivery questions.",
  },
  {
    title: "Role-based access flows tightened",
    description:
      "Every role sees only the modules relevant to their responsibilities, ensuring operational focus for warehouse, dispatch, and client teams.",
  },
]

// ── Build plan snapshot ──────────────────────────────────────────────────────

const BUILD_PLAN = [
  {
    title: "Foundation",
    description:
      "Role-based navigation, tenant + user modeling, and standardized data interfaces.",
  },
  {
    title: "Warehouse Ops Core",
    description:
      "Inbound receiving, inventory accuracy, storage planning, orders, and task execution.",
  },
  {
    title: "Dispatch & Delivery",
    description:
      "Fleet management, live dispatcher console, route optimization, dispatch queue, and driver app.",
  },
  {
    title: "Client Experience",
    description:
      "B2B client portal, end-customer tracking, and transparent billing views.",
  },
  {
    title: "Analytics & Reliability",
    description:
      "Operational dashboards, alerts, audit trails, and performance foundations.",
  },
]

const BUILD_PLAN_NEXT_STEPS = [
  "Keep the Platform Intro page aligned with live capabilities.",
  "Validate Supabase schemas against UI needs.",
  "Define strict RBAC + tenant scoping rules.",
  "Identify modules that require realtime updates.",
]

// ── Workflow detail ───────────────────────────────────────────────────────────

const WORKFLOW_DETAIL = [
  {
    title: "Receive and organize inventory",
    description:
      "Inbound shipments are captured, validated against purchase orders, and staged. Putaway tasks are generated automatically with rack assignment suggestions to maximize space utilization.",
  },
  {
    title: "Maintain real-time stock accuracy",
    description:
      "Inventory updates with every pick, pack, receipt, and return. Available stock is always current, preventing overselling and reducing backorders for you and your clients.",
  },
  {
    title: "Fulfill orders with less friction",
    description:
      "Orders generate pick/pack tasks automatically. The dispatch queue highlights what is packed and ready — shipping teams never chase order status across systems.",
  },
  {
    title: "Dispatch and deliver with clarity",
    description:
      "The dispatcher auto-assigns drivers by zone and capacity. Drivers execute on their mobile app. Customers track delivery in real time — no calls, no manual updates.",
  },
  {
    title: "Close the loop with reporting and billing",
    description:
      "Delivery and storage activity feeds invoices and KPI reporting automatically. Clients see transparent usage-based charges. Leadership acts on actual utilization, not guesswork.",
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function PlatformIntro() {
  const { selectedRole, selectedTenant } = useDemo()

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-200 via-cyan-200 to-slate-100 opacity-70 blur-2xl" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200 via-orange-200 to-slate-100 opacity-60 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-900 text-white">Interactive Demo</Badge>
            <Badge variant="outline" className="border-slate-300 text-slate-700">WMS + Last-Mile Delivery</Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            The WMS + Delivery platform that removes operational friction
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            A fully integrated warehouse management and last-mile delivery system. This demo lets you explore every module, switch between roles, and see how each part of the operation connects — from inbound receiving to customer doorstep.
          </p>
        </div>
        <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Building2 className="h-4 w-4" /> Active Tenant
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedTenant.name}</p>
              <p className="text-sm text-slate-500">{selectedTenant.type} plan — switch tenants in the top bar to see different data sets.</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Shield className="h-4 w-4" /> Active Role
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900 capitalize">{selectedRole.replace(/_/g, " ")}</p>
              <p className="text-sm text-slate-500">The sidebar and available modules change based on the role selected.</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Compass className="h-4 w-4" /> 10 Roles Available
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">Role-based navigation</p>
              <p className="text-sm text-slate-500">Each role sees only the modules relevant to their work — no clutter.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── How to explore this demo ── */}
      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Shield className="h-4 w-4" /> Switch roles
            </div>
            <p className="text-sm text-slate-700">Use the role dropdown in the top bar to see the platform through each team member&apos;s eyes. The sidebar updates instantly.</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Building2 className="h-4 w-4" /> Switch tenants
            </div>
            <p className="text-sm text-slate-700">Select a different tenant from the top bar to see isolated data sets — each client&apos;s inventory, orders, and billing are fully separate.</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Compass className="h-4 w-4" /> Navigate modules
            </div>
            <p className="text-sm text-slate-700">Click any item in the left sidebar to open that module. Sections are grouped by operational area — warehouse, dispatch, client portal, and more.</p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-purple-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
              <Network className="h-4 w-4" /> See it connected
            </div>
            <p className="text-sm text-slate-700">Actions in one module flow to others. Pack an order — it appears in the dispatch queue. Dispatch it — the driver app and tracking portal update.</p>
          </CardContent>
        </Card>
      </section>

      {/* ── Value points ── */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Why teams choose this platform</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {VALUE_POINTS.map((point) => (
            <Card key={point.title} className="border-slate-200">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <point.icon className="h-4 w-4" /> {point.title}
                </div>
                <p className="text-sm text-slate-600">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Recent updates ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Sparkles className="h-4 w-4" /> Recent updates (March 5, 2026)
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Highlights from the most recent platform work, focused on multi-tenant operations and end-customer visibility.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {RECENT_UPDATES.map((update) => (
            <Card key={update.title} className="border-slate-100 bg-slate-50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>{update.title}</span>
                </div>
                <p className="text-xs text-slate-500">{update.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Build plan ── */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ClipboardList className="h-4 w-4" /> Build plan snapshot
        </div>
        <p className="mt-2 text-sm text-slate-500">
          The roadmap prioritizes core warehouse execution, delivery orchestration, and client visibility.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {BUILD_PLAN.map((item) => (
            <Card key={item.title} className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-700">{item.title}</div>
                <p className="text-xs text-slate-500">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-700">Immediate next steps</div>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {BUILD_PLAN_NEXT_STEPS.map((step) => (
              <li key={step} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Roles ── */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Who uses this platform</h2>
        <p className="text-sm text-slate-500 mb-4">10 distinct roles, each with a tailored view. Switch roles in the top bar to explore any of them.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.role} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{r.role}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── End-to-end flow ── */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Route className="h-4 w-4" /> End-to-end operational flow
        </div>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                {step}
              </span>
              {i < FLOW_STEPS.length - 1 && (
                <span className="text-slate-300 text-sm">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Each step feeds the next: inbound receipts create inventory, inventory enables orders, orders generate pick/pack tasks, completed packs enter the dispatch queue, dispatched routes go to drivers, and delivery status powers the tracking portal, client reports, and billing.
        </p>
      </section>

      {/* ── Workflow detail ── */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">How the workflow flows</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {WORKFLOW_DETAIL.map((item) => (
            <Card key={item.title} className="border-slate-200">
              <CardContent className="p-5 space-y-2">
                <div className="text-sm font-semibold text-slate-700">{item.title}</div>
                <p className="text-sm text-slate-600">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Page groups ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Module reference</h2>
          <p className="text-sm text-slate-500 mt-1">Every screen in the platform, what it does, and how it connects to the rest of the system.</p>
        </div>
        {PAGE_GROUPS.map((group) => (
          <Card key={group.title} className="border-slate-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{group.description}</p>
                </div>
                <Sparkles className="h-5 w-5 text-slate-300" />
              </div>
              <div className="space-y-3">
                {group.pages.map((page) => (
                  <div key={page.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <page.icon className="h-4 w-4 text-slate-500" />
                      <p className="font-semibold text-slate-900">{page.label}</p>
                      <Badge variant="secondary" className="ml-auto bg-white text-slate-500 border border-slate-200 font-normal">Module</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{page.summary}</p>
                    <p className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2">Connects to: {page.connectsTo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

    </div>
  )
}
