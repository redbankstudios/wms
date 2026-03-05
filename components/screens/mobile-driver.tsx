"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin, Navigation, Phone, MessageSquare, CheckCircle2, AlertCircle, ArrowLeft,
  Camera, PenTool, ScanLine, Package, Loader2, User, Star, DollarSign,
  Calendar, TrendingUp, FileText, ChevronRight, Send, Truck, Clock, Shield,
  List, Map as MapIcon
} from "lucide-react"
import { RouteStop } from "@/types"
import { getProvider } from "@/data"
import { useSearchParams } from "next/navigation"
import { useDemo } from "@/context/DemoContext"
import { useMessages, DriverMessage } from "@/context/MessagesContext"
import dynamic from "next/dynamic"

const MobileDriverMap = dynamic(
  () => import("./mobile-driver-map").then(m => m.MobileDriverMap),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-100">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )}
)

// ── Mock driver profile data ──────────────────────────────────────────────────
const MOCK_DRIVER = {
  id: "DRV-01",
  name: "John Doe",
  phone: "+1 (415) 555-0182",
  email: "john.doe@dispatch.io",
  license: "CA-DL-4892013",
  vehicleId: "VEH-101",
  vehicle: "Ford Transit · PLT-8821",
  rating: 4.8,
  ratingCount: 312,
  status: "on_route" as const,
  avatar: "JD",
  hireDate: "Mar 15, 2022",
  zone: "Bay Area South",
}

const MOCK_EARNINGS = {
  period: "Mar 1 – Mar 7, 2026",
  basePay: 840,
  deliveryBonus: 120,
  tips: 45,
  deductions: -38,
  net: 967,
  ytd: 9834,
  deliveriesThisWeek: 62,
  nextPayDate: "Mar 14, 2026",
}

const MOCK_SCHEDULE = [
  { day: "Mon", date: "Mar 2", shift: "08:00 – 16:00", status: "completed", route: "RT-839" },
  { day: "Tue", date: "Mar 3", shift: "08:00 – 16:00", status: "completed", route: "RT-841" },
  { day: "Wed", date: "Mar 4", shift: "08:00 – 16:00", status: "active", route: "RT-842" },
  { day: "Thu", date: "Mar 5", shift: "08:00 – 16:00", status: "scheduled", route: "RT-845" },
  { day: "Fri", date: "Mar 6", shift: "09:00 – 17:00", status: "scheduled", route: "RT-847" },
  { day: "Sat", date: "Mar 7", shift: "Day Off", status: "off", route: null },
  { day: "Sun", date: "Mar 8", shift: "Day Off", status: "off", route: null },
]

// ── Helper: group messages by conversationId ──────────────────────────────────
function groupConversations(messages: DriverMessage[]) {
  const map = new Map<string, { messages: DriverMessage[]; latest: DriverMessage }>()
  // messages are stored newest first for inbound but we need chronological for threads
  // build conversations
  for (const msg of messages) {
    if (!map.has(msg.conversationId)) {
      map.set(msg.conversationId, { messages: [msg], latest: msg })
    } else {
      const conv = map.get(msg.conversationId)!
      conv.messages.push(msg)
      // keep latest by wall-clock insertion order (last added)
      conv.latest = msg
    }
  }
  return Array.from(map.entries()).map(([id, val]) => ({
    id,
    trackingNumber: val.latest.trackingNumber,
    customerName: val.messages.find(m => m.direction === "inbound")?.senderName ?? "Customer",
    latest: val.latest,
    messages: val.messages,
    unread: val.messages.filter(m => m.direction === "inbound").length,
  }))
}

type DriverView = "route" | "chat" | "profile"

export function MobileDriverApp() {
  const api = React.useMemo(() => getProvider(), [])
  const searchParams = useSearchParams()
  const { selectedTenant } = useDemo()
  const { messages, addReply } = useMessages()

  const [activeStop, setActiveStop] = React.useState<RouteStop | null>(null)
  const [podState, setPodState] = React.useState<"idle" | "capturing" | "success">("idle")
  const [stops, setStops] = React.useState<RouteStop[]>([])
  const [tenantId, setTenantId] = React.useState<string | null>(null)
  const [routeId, setRouteId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [driverView, setDriverView] = React.useState<DriverView>("route")
  const [routeView, setRouteView] = React.useState<"list" | "map">("list")

  // Chat state
  const [activeConversation, setActiveConversation] = React.useState<string | null>(null)
  const [replyText, setReplyText] = React.useState("")

  // Profile sub-view
  const [profileTab, setProfileTab] = React.useState<"overview" | "earnings" | "schedule">("overview")

  React.useEffect(() => {
    async function resolveTenantId() {
      const tenantIdFromUrl = searchParams.get("tenantId")
      if (tenantIdFromUrl) { setTenantId(tenantIdFromUrl); return }
      if (selectedTenant?.id) { setTenantId(selectedTenant.id); return }
      const tenants = await api.tenants.getTenants()
      setTenantId(tenants[0]?.id ?? null)
    }
    resolveTenantId()
  }, [api, searchParams, selectedTenant?.id])

  React.useEffect(() => {
    async function resolveRouteId() {
      const routeIdFromUrl = searchParams.get("routeId")
      if (routeIdFromUrl) { setRouteId(routeIdFromUrl); return }
      if (tenantId) {
        const tenantRoutes = await api.routes.getRoutesByTenant(tenantId)
        if (tenantRoutes[0]?.id) { setRouteId(tenantRoutes[0].id); return }
      }
      const allRoutes = await api.routes.getAllRoutes()
      setRouteId(allRoutes[0]?.id ?? null)
    }
    resolveRouteId()
  }, [api, searchParams, tenantId])

  React.useEffect(() => {
    async function loadStops() {
      if (!routeId) return
      setLoading(true)
      const data = await api.routes.getRouteStops(routeId)
      setStops(data)
      setLoading(false)
    }
    loadStops()
  }, [api, routeId])

  const conversations = React.useMemo(() => groupConversations(messages), [messages])
  const inboundCount = messages.filter(m => m.direction === "inbound").length

  const handleSendReply = () => {
    const text = replyText.trim()
    if (!text || !activeConversation) return
    addReply(activeConversation, text)
    setReplyText("")
  }

  const handleStartStop = (stop: RouteStop) => {
    setActiveStop(stop)
    setPodState("idle")
  }

  const handleCompleteStop = async () => {
    if (activeStop) {
      try {
        await api.routes.updateRouteStop(activeStop.id, { status: "completed" })
        if (activeStop.orderId) {
          await api.orders.updateOrderStatus(activeStop.orderId, "delivered")
        }
        setStops(prev => prev.map(s => s.id === activeStop.id ? { ...s, status: "completed" as const } : s))
      } catch {
        // Optimistic: continue even if DB update fails in demo
      }
    }
    setActiveStop(null)
    setPodState("idle")
  }

  // ── Stop Detail View ──────────────────────────────────────────────────────────
  if (!loading && activeStop) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Driver Delivery App</h2>
          <p className="text-slate-500">Interactive mobile mockup for delivery drivers.</p>
        </div>
        <div className="w-full max-w-[400px] h-[800px] bg-slate-50 border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col">
          <div className="h-7 bg-slate-900 w-full flex items-center justify-between px-6 text-[10px] text-white font-medium">
            <span>11:45</span>
            <div className="flex space-x-1"><span>5G</span><span>82%</span></div>
          </div>

          <div className="flex-1 flex flex-col h-full bg-slate-50">
            <div className="bg-slate-900 p-4 text-white flex items-center shadow-md z-10">
              <button onClick={() => setActiveStop(null)} className="mr-3 p-2 hover:bg-white/20 rounded-full transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h2 className="font-bold text-lg">Stop Details</h2>
                <p className="text-white/80 text-sm">{activeStop.id}</p>
              </div>
            </div>

            <div className="h-48 bg-slate-200 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm flex items-center font-medium text-sm text-slate-700 z-10">
                <Navigation className="h-4 w-4 mr-2 text-blue-500" />
                Mapbox Integration Placeholder
              </div>
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <path d="M 50 150 Q 150 50 200 100 T 350 80" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="8 4" className="animate-[dash_20s_linear_infinite]" />
                <circle cx="350" cy="80" r="6" fill="#ef4444" stroke="white" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-24">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{activeStop.customer}</h1>
                <p className="text-slate-600 flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 text-slate-400 flex-shrink-0" />
                  {activeStop.address}
                </p>
              </div>

              <div className="flex space-x-3 mb-6">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-12">
                  <Navigation className="mr-2 h-5 w-5" /> Navigate
                </Button>
                <Button variant="outline" className="flex-1 h-12 border-slate-300 text-slate-700">
                  <Phone className="mr-2 h-5 w-5" /> Call
                </Button>
              </div>

              {activeStop.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center text-amber-800 font-bold mb-1 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1.5" /> Delivery Notes
                  </div>
                  <p className="text-amber-900 text-sm">{activeStop.notes}</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">Packages ({activeStop.packages})</h3>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600">Scan Required</Badge>
                </div>

                {podState === "idle" && (
                  <Button variant="outline" className="w-full h-14 border-dashed border-2 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <ScanLine className="mr-2 h-5 w-5" /> Scan Packages
                  </Button>
                )}
                {podState === "capturing" && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-32 flex items-center justify-center relative">
                      <PenTool className="h-8 w-8 text-slate-300 absolute" />
                      <span className="text-sm font-medium text-slate-400 mt-12">Customer Signature</span>
                    </div>
                    <Button variant="outline" className="w-full h-12">
                      <Camera className="mr-2 h-5 w-5" /> Take Photo
                    </Button>
                  </div>
                )}
                {podState === "success" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center">
                    <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Proof of Delivery Captured</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Signature & Photo saved.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-8">
              {podState === "idle" ? (
                <Button className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800" onClick={() => setPodState("capturing")}>
                  Capture POD
                </Button>
              ) : podState === "capturing" ? (
                <Button className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800" onClick={() => setPodState("success")}>
                  Save POD
                </Button>
              ) : (
                <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" onClick={handleCompleteStop}>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Driver Delivery App</h2>
        <p className="text-slate-500">Interactive mobile mockup for delivery drivers.</p>
      </div>

      {/* Mobile Device Frame */}
      <div className="w-full max-w-[400px] h-[800px] bg-slate-50 border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col">

        {/* Status Bar */}
        <div className="h-7 bg-slate-900 w-full flex items-center justify-between px-6 text-[10px] text-white font-medium">
          <span>11:45</span>
          <div className="flex space-x-1"><span>5G</span><span>82%</span></div>
        </div>

        {/* App Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>

        ) : driverView === "chat" ? (
          /* ── Chat View ── */
          activeConversation ? (
            /* Thread View */
            <ChatThread
              conversation={conversations.find(c => c.id === activeConversation)!}
              replyText={replyText}
              setReplyText={setReplyText}
              onSend={handleSendReply}
              onBack={() => setActiveConversation(null)}
            />
          ) : (
            /* Conversation List */
            <div className="flex-1 flex flex-col h-full bg-slate-50">
              <div className="bg-slate-900 p-4 text-white flex items-center shadow-md">
                <MessageSquare className="h-5 w-5 mr-3 text-blue-400" />
                <div>
                  <h2 className="font-bold text-lg">Messages</h2>
                  <p className="text-white/60 text-xs">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
                </div>
                {inboundCount > 0 && (
                  <div className="ml-auto h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">
                    {inboundCount}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                      <MessageSquare className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700 mb-1">No messages yet</p>
                    <p className="text-xs text-slate-400">Customer messages will appear here</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      className="w-full text-left px-4 py-3 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center space-x-3"
                      onClick={() => setActiveConversation(conv.id)}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-sm font-bold text-slate-800 truncate">{conv.customerName}</p>
                          <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{conv.latest.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mb-1">{conv.trackingNumber}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {conv.latest.direction === "outbound" ? "You: " : ""}{conv.latest.text}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                        {conv.unread > 0 && (
                          <span className="h-4 w-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )

        ) : driverView === "profile" ? (
          /* ── Profile View ── */
          <DriverProfile
            profileTab={profileTab}
            setProfileTab={setProfileTab}
          />

        ) : (
          /* ── Route View (List or Map) ── */
          <div className="flex-1 flex flex-col h-full">
            <div className="bg-slate-900 text-white p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold">Today&apos;s Route</h1>
                  <p className="text-slate-400 text-sm mt-1">Route RT-842 · {stops.length} Stops</p>
                </div>
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">ON ROUTE</div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-2 font-medium">
                  <span>Progress</span>
                  <span>1 / {stops.length} Completed</span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${stops.length ? (1 / stops.length) * 100 : 0}%` }} />
                </div>
              </div>
              {/* List / Map toggle */}
              <div className="flex bg-slate-800 rounded-lg p-0.5 self-start w-fit">
                <button
                  className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeView === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => setRouteView("list")}
                >
                  <List className="h-3.5 w-3.5 mr-1.5" /> List
                </button>
                <button
                  className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeView === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  onClick={() => setRouteView("map")}
                >
                  <MapIcon className="h-3.5 w-3.5 mr-1.5" /> Map
                </button>
              </div>
            </div>

            {routeView === "map" ? (
              <MobileDriverMap stops={stops} onStopSelect={handleStartStop} />
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
                {stops.map((stop, index) => (
                  <Card
                    key={stop.id}
                    className={`border-0 shadow-sm overflow-hidden cursor-pointer transition-transform active:scale-95 ${stop.status === 'completed' ? 'opacity-60' : ''}`}
                    onClick={() => stop.status !== 'completed' && handleStartStop(stop)}
                  >
                    <div className="flex">
                      <div className={`w-2 flex-shrink-0 ${
                        stop.status === 'completed' ? 'bg-emerald-500' :
                        stop.status === 'next' ? 'bg-blue-500' : 'bg-slate-300'
                      }`} />
                      <CardContent className="p-4 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stop {index + 1}</span>
                          {stop.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {stop.status === 'next' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">NEXT</Badge>}
                        </div>
                        <h3 className={`font-bold text-lg mb-1 ${stop.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {stop.customer}
                        </h3>
                        <div className="flex items-start text-slate-600 text-sm mb-3">
                          <MapPin className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0 text-slate-400" />
                          <span className="leading-tight">{stop.address}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                          <div className="text-xs font-medium text-slate-500">{stop.time}</div>
                          <div className="flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            <Package className="h-3 w-3 mr-1" />
                            {stop.packages} PKG
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 pb-2 z-20">
          <button
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${driverView === "route" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => setDriverView("route")}
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Route</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors relative ${driverView === "chat" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => { setDriverView("chat"); setActiveConversation(null) }}
          >
            <div className="relative">
              <MessageSquare className="h-6 w-6 mb-1" />
              {inboundCount > 0 && driverView !== "chat" && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {inboundCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Chat</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${driverView === "profile" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
            onClick={() => setDriverView("profile")}
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Chat Thread Component ─────────────────────────────────────────────────────
function ChatThread({
  conversation,
  replyText,
  setReplyText,
  onSend,
  onBack,
}: {
  conversation: { customerName: string; trackingNumber: string; messages: DriverMessage[] }
  replyText: string
  setReplyText: (v: string) => void
  onSend: () => void
  onBack: () => void
}) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.messages.length])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSend()
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex items-center shadow-md">
        <button onClick={onBack} className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-sm">{conversation.customerName}</p>
          <p className="text-[10px] text-white/60 font-mono">{conversation.trackingNumber}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.direction === "outbound"
                ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-white text-slate-800 shadow-sm rounded-bl-sm"
            }`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-blue-200" : "text-slate-400"}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="p-3 bg-white border-t border-slate-200 pb-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to customer..."
            className="flex-1 h-10 px-4 text-sm bg-slate-100 rounded-full border-0 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onSend}
            disabled={!replyText.trim()}
            className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Driver Profile Component ──────────────────────────────────────────────────
function DriverProfile({
  profileTab,
  setProfileTab,
}: {
  profileTab: "overview" | "earnings" | "schedule"
  setProfileTab: (v: "overview" | "earnings" | "schedule") => void
}) {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-5 pt-5 pb-0 text-white">
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {MOCK_DRIVER.avatar}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{MOCK_DRIVER.name}</h2>
            <p className="text-white/60 text-xs">{MOCK_DRIVER.vehicle}</p>
            <div className="flex items-center mt-1 space-x-2">
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-400 mr-0.5" />
                <span className="text-xs font-bold">{MOCK_DRIVER.rating}</span>
                <span className="text-[10px] text-white/50 ml-1">({MOCK_DRIVER.ratingCount})</span>
              </div>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0">On Route</Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(["overview", "earnings", "schedule"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setProfileTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                profileTab === tab
                  ? "border-b-2 border-blue-400 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {profileTab === "overview" && <ProfileOverview />}
        {profileTab === "earnings" && <ProfileEarnings />}
        {profileTab === "schedule" && <ProfileSchedule />}
      </div>
    </div>
  )
}

function ProfileOverview() {
  return (
    <div className="p-4 space-y-3">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">This Week</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${MOCK_EARNINGS.net}</p>
          <p className="text-xs text-emerald-600 font-medium">Net Pay</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Deliveries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{MOCK_EARNINGS.deliveriesThisWeek}</p>
          <p className="text-xs text-slate-500 font-medium">This week</p>
        </div>
      </div>

      {/* Driver details */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Driver Info</p>
        </div>
        {[
          { icon: Phone, label: "Phone", value: MOCK_DRIVER.phone },
          { icon: Shield, label: "License", value: MOCK_DRIVER.license },
          { icon: Truck, label: "Vehicle", value: MOCK_DRIVER.vehicle },
          { icon: MapPin, label: "Zone", value: MOCK_DRIVER.zone },
          { icon: Clock, label: "Hired", value: MOCK_DRIVER.hireDate },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0">
            <Icon className="h-4 w-4 text-slate-400 mr-3 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className="text-sm text-slate-800 font-medium truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payroll access */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">Payroll & Documents</p>
        </div>
        {[
          { icon: FileText, label: "Latest Pay Stub", sub: "Mar 7, 2026", badge: "PDF" },
          { icon: DollarSign, label: "YTD Earnings", sub: `$${MOCK_EARNINGS.ytd.toLocaleString()}` },
          { icon: TrendingUp, label: "Performance Report", sub: "Feb 2026", badge: "View" },
        ].map(({ icon: Icon, label, sub, badge }) => (
          <button key={label} className="w-full flex items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
            <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Icon className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
            {badge ? (
              <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px]">{badge}</Badge>
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-300" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProfileEarnings() {
  return (
    <div className="p-4 space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-slate-400">Pay Period</p>
            <p className="text-sm font-bold text-slate-800">{MOCK_EARNINGS.period}</p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-2.5">
          {[
            { label: "Base Pay", value: MOCK_EARNINGS.basePay, color: "text-slate-800" },
            { label: "Delivery Bonus", value: MOCK_EARNINGS.deliveryBonus, color: "text-emerald-600" },
            { label: "Tips", value: MOCK_EARNINGS.tips, color: "text-emerald-600" },
            { label: "Deductions", value: MOCK_EARNINGS.deductions, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-slate-600">{label}</span>
              <span className={`text-sm font-semibold ${color}`}>
                {value < 0 ? `-$${Math.abs(value)}` : `+$${value}`}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Net Pay</span>
            <span className="text-lg font-extrabold text-slate-900">${MOCK_EARNINGS.net}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Year to Date</p>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">${MOCK_EARNINGS.ytd.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Jan 1 – Mar 4, 2026</p>
          </div>
          <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-900">Next Pay Date</p>
            <p className="text-xs text-blue-600">{MOCK_EARNINGS.nextPayDate} · Direct Deposit</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSchedule() {
  const dayColors: Record<string, string> = {
    completed: "bg-emerald-500",
    active: "bg-blue-500",
    scheduled: "bg-slate-300",
    off: "bg-transparent",
  }
  const statusLabel: Record<string, string> = {
    completed: "Done",
    active: "Active",
    scheduled: "Scheduled",
    off: "Off",
  }

  return (
    <div className="p-4 space-y-3">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">This Week</p>
          <p className="text-[10px] text-slate-400">Mar 2 – Mar 8, 2026</p>
        </div>
        {MOCK_SCHEDULE.map((day) => (
          <div key={day.day} className={`flex items-center px-4 py-3 border-b border-slate-50 last:border-0 ${day.status === "active" ? "bg-blue-50" : ""}`}>
            <div className={`w-1.5 h-10 rounded-full mr-4 flex-shrink-0 ${dayColors[day.status]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="text-xs font-bold text-slate-700 w-8">{day.day}</span>
                <span className="text-[10px] text-slate-400 ml-1">{day.date}</span>
              </div>
              <p className="text-sm text-slate-700 font-medium mt-0.5">{day.shift}</p>
              {day.route && <p className="text-[10px] text-slate-400 font-mono">{day.route}</p>}
            </div>
            <div>
              {day.status !== "off" ? (
                <Badge className={`text-[10px] ${
                  day.status === "active" ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                  day.status === "completed" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                  "bg-slate-100 text-slate-600 hover:bg-slate-100"
                }`}>
                  {statusLabel[day.status]}
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 rounded-xl p-4 text-center">
        <Calendar className="h-5 w-5 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Full schedule & time-off requests available in the HR portal</p>
      </div>
    </div>
  )
}
