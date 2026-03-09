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
  "Inbound Shipment",
  "Receiving Session",
  "Scan & Reconcile",
  "Putaway",
  "Inventory Ledger",
  "Orders",
  "Tasks",
  "Dispatch Queue",
  "Routes & Driver App",
  "Tracking Portal",
  "Reports",
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
    title: "Business Owner Control Center",
    description: "The core controls you use to run your tenant, your team, and your financial visibility.",
    icon: Building2,
    pages: [
      {
        label: "Tenants (Platform View)",
        icon: Building2,
        summary: "For platform-level operators only. Manage client accounts, subscription tiers, onboarding status, and account health. Business owners typically stay inside their own tenant, but this view is available for multi-tenant operators.",
        connectsTo: "Controls tenant-level context across every module in the app shell.",
      },
      {
        label: "Settings",
        icon: Shield,
        summary: "Configure your warehouse structure, operational defaults, client mappings, and notification rules. This is where business owners standardize how work runs across inbound, tasks, dispatch, and billing.",
        connectsTo: "Applies shared operating rules across warehouse, delivery, and client portal workflows.",
      },
      {
        label: "Employees",
        icon: Users,
        summary: "Manage your internal team roster with role-based permissions. Add managers, warehouse employees, packers, dispatchers, and drivers so each person sees only the screens required for their job.",
        connectsTo: "Role assignments drive sidebar navigation, API write permissions, and operational accountability.",
      },
      {
        label: "Business Reports",
        icon: BarChart3,
        summary: "Executive KPI view for business owners: shipped volume, on-time delivery, return rate, storage utilization, productivity, and margin trends. Use it to monitor SLA performance and client profitability from one screen.",
        connectsTo: "Aggregates operational signals from orders, tasks, returns, inventory, and routes.",
      },
      {
        label: "Order Reports",
        icon: BarChart3,
        summary: "Dedicated order analytics by date range and client/vendor filter. Use this view to track throughput, spot spikes, and validate whether staffing and fleet capacity match demand.",
        connectsTo: "Pulls order activity and links directly to fulfillment and dispatch planning decisions.",
      },
      {
        label: "Client Billing",
        icon: CreditCard,
        summary: "Invoice center for subscription and usage transparency. Review current-month usage, invoice history, payment methods, and outstanding balances so both your team and your clients have clear financial visibility.",
        connectsTo: "Uses usage signals from storage, fulfillment, and delivery operations.",
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
        summary: "Run scan-driven receiving sessions from shipment arrival to final reconciliation. Operators can scan barcodes (or enter SKU manually), compare received vs expected quantities, auto-raise overage/shortage/mismatch exceptions, and post matched quantities to inventory.",
        connectsTo: "Feeds putaway tasks, inventory availability, receiving exception queues, and inbound audit history.",
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
        summary: "Real-time stock by SKU and location with adjustment and transfer controls. Behind the scenes, quantity changes are now captured through an immutable movement ledger foundation with derived balances for stronger traceability.",
        connectsTo: "Drives order allocation, replenishment decisions, client inventory visibility, and inventory auditability.",
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
    title: "Secure write boundary + audit logging completed",
    description:
      "All critical mutations now run through trusted API routes with auth, tenant, and role checks before writes. Audit events are now logged for key operational updates.",
  },
  {
    title: "Inventory ledger foundation added",
    description:
      "Inventory movements and derived balances are implemented to support immutable quantity tracking and improved reconciliation.",
  },
  {
    title: "Barcode + UOM conversion model implemented",
    description:
      "Products can now support multiple barcodes and per-product unit conversions (each, case, pallet, pack) to power scan-accurate receiving flows.",
  },
  {
    title: "Smart Receiving core implemented",
    description:
      "Receiving sessions, scan outcomes, and auto-exception handling (unknown barcode, mismatch, overage, shortage) are now built and connected to inventory posting paths.",
  },
]

// ── Capability snapshot ──────────────────────────────────────────────────────

const BUILD_PLAN = [
  {
    title: "Security foundation",
    description:
      "Authentication infrastructure, trusted mutation API routes, and audit logging are complete.",
  },
  {
    title: "Inventory control foundation",
    description:
      "Inventory movement ledger and balance tables are implemented to improve stock traceability.",
  },
  {
    title: "Receiving intelligence",
    description:
      "Smart Receiving sessions, scan posting, and exception rules are implemented for inbound accuracy.",
  },
  {
    title: "Barcode and UOM model",
    description:
      "Multi-barcode product support and conversion logic are ready for scan-driven operations.",
  },
  {
    title: "Operational platform coverage",
    description:
      "Warehouse, dispatch, client portal, reports, and billing modules remain connected as one workflow.",
  },
]

const BUILD_PLAN_NEXT_STEPS = [
  "Apply staged DB migrations in production for ledger, barcode/UOM, and smart receiving tables.",
  "Load each client's product barcodes and case/pallet conversion rules.",
  "Train receiving teams on scan workflows and exception review procedures.",
  "Use Business Reports + Billing monthly to review margin and service-level performance.",
]

// ── Workflow detail ───────────────────────────────────────────────────────────

const WORKFLOW_DETAIL = [
  {
    title: "Start receiving with scan accuracy",
    description:
      "Open a receiving session per inbound shipment, scan barcodes (or enter SKU), and reconcile against expected manifest quantities. Exceptions are raised instantly when something is unknown, mismatched, or over expected.",
  },
  {
    title: "Post validated stock into inventory",
    description:
      "Matched scans can post directly into inventory movement tracking, where quantity and location changes are recorded and balances are updated for reliable stock visibility.",
  },
  {
    title: "Run fulfillment from one queue",
    description:
      "Orders feed pick and pack tasks, completed packs land in dispatch queue, and dispatch teams can assign drivers using zone and capacity context without spreadsheet handoffs.",
  },
  {
    title: "Deliver with live visibility",
    description:
      "Drivers execute routes in the mobile app, dispatch monitors route progress and exceptions live, and end customers track deliveries through the public tracking portal.",
  },
  {
    title: "Close the loop with reports and billing",
    description:
      "Operations data rolls into business and order reports plus billing visibility, giving business owners one place to monitor throughput, service levels, and revenue quality.",
  },
]

const OWNER_WALKTHROUGH = [
  {
    title: "1. Configure your operation",
    description:
      "Use Settings, Storage, and Employees to define zones/racks, assign team roles, and establish your daily operating structure.",
    icon: ShieldCheck,
  },
  {
    title: "2. Receive inventory with control",
    description:
      "Open inbound receiving sessions, scan products, and reconcile expected vs received quantities while capturing exceptions for supervisor review.",
    icon: ArrowDownToLine,
  },
  {
    title: "3. Fulfill and dispatch orders",
    description:
      "Move orders through pick/pack tasks, then push packed shipments into Dispatch Queue for route and driver assignment.",
    icon: Send,
  },
  {
    title: "4. Execute delivery in the field",
    description:
      "Dispatch teams monitor routes live while drivers complete stops in the Driver App and publish tracking updates to customers.",
    icon: Truck,
  },
  {
    title: "5. Review performance and billing",
    description:
      "Close each cycle with business reports, order trends, and invoice visibility so you can improve SLA, margin, and client communication.",
    icon: BarChart3,
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
            Your business-owner walkthrough of the WMS + Delivery platform
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            This intro is built for subscribed business owners: start with setup, run inbound and fulfillment, control dispatch, and close the month with reporting and billing. Every module is connected so your team works from one operating system.
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
                <Compass className="h-4 w-4" /> {ROLES.length} Roles Available
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
              <Shield className="h-4 w-4" /> Start as business owner
            </div>
            <p className="text-sm text-slate-700">Keep the role set to Business Owner first to follow this walkthrough in the intended order.</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Building2 className="h-4 w-4" /> Confirm your tenant
            </div>
            <p className="text-sm text-slate-700">Your data stays tenant-scoped. If you operate multiple brands, switch tenant context in the top bar.</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Compass className="h-4 w-4" /> Follow the flow
            </div>
            <p className="text-sm text-slate-700">Move through Inbound → Inventory → Orders → Dispatch Queue → Routes to see the full operation lifecycle.</p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-purple-50">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
              <Network className="h-4 w-4" /> Validate cross-module sync
            </div>
            <p className="text-sm text-slate-700">Test one action end to end: receive or pack an order, then confirm downstream updates in dispatch, tracking, reports, and billing.</p>
          </CardContent>
        </Card>
      </section>

      {/* ── Business owner walkthrough ── */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Business owner walkthrough</h2>
        <p className="text-sm text-slate-500 mb-4">Follow these five steps to evaluate the full platform from setup to monthly performance review.</p>
        <div className="grid gap-4 lg:grid-cols-5">
          {OWNER_WALKTHROUGH.map((step) => (
            <Card key={step.title} className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <step.icon className="h-4 w-4" /> {step.title}
                </div>
                <p className="text-xs text-slate-600">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
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
          <Sparkles className="h-4 w-4" /> Recent updates (March 9, 2026)
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Highlights from the latest release cycle across security, inventory control, and receiving accuracy.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          <ClipboardList className="h-4 w-4" /> Platform capability snapshot
        </div>
        <p className="mt-2 text-sm text-slate-500">
          What is already implemented and what to operationalize next as part of rollout.
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
          <div className="text-sm font-semibold text-slate-700">Owner launch checklist</div>
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
          <Route className="h-4 w-4" /> End-to-end business flow
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
          Each step feeds the next: receiving creates trusted inventory, inventory enables fulfillment, fulfillment feeds dispatch, route execution powers customer visibility, and completed activity rolls into reporting and billing.
        </p>
      </section>

      {/* ── Workflow detail ── */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">How your daily operation runs</h2>
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
          <p className="text-sm text-slate-500 mt-1">Every available screen, who uses it, and how it connects to your end-to-end operation.</p>
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
