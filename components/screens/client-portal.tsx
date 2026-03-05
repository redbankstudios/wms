"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search, MapPin, Package, Truck, CheckCircle2, FileText,
  Star, Phone, Send, MessageSquare, Settings, Undo2,
  Clock, Home, UserCheck, ChevronRight, ChevronLeft,
  ArrowRight, CheckSquare, AlertCircle, Loader2, XCircle,
} from "lucide-react"
import { useMessages } from "@/context/MessagesContext"
import { getProvider } from "@/data"
import { Order, OrderLine } from "@/types"

const MOCK_DRIVER = {
  name: "Marcus Johnson",
  initials: "MJ",
  rating: 4.9,
  vehicle: "Sprinter Van · PLT-4921",
  phone: "+1 (415) 555-0193",
}

// Fallback items shown in Return tab when no order has been looked up
const FALLBACK_ITEMS = [
  { name: "MacBook Pro 14\"", qty: 1 },
  { name: "USB-C Hub", qty: 2 },
  { name: "Wireless Mouse", qty: 1 },
]

// Map order status → visual step index (0–4)
const STATUS_STEP: Record<Order["status"], number> = {
  pending: 0,
  allocated: 0,
  picking: 1,
  packed: 1,
  shipped: 3,
  delivered: 4,
}

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Order Received",
  allocated: "Processing",
  picking: "Packing",
  packed: "Ready to Ship",
  shipped: "Out for Delivery",
  delivered: "Delivered",
}

const STATUS_HEADER_CLS: Record<Order["status"], string> = {
  pending: "bg-slate-700",
  allocated: "bg-slate-700",
  picking: "bg-amber-600",
  packed: "bg-amber-600",
  shipped: "bg-blue-600",
  delivered: "bg-emerald-600",
}

const TRACK_STEPS = [
  { label: "Ordered",          icon: FileText     },
  { label: "Packed",           icon: Package      },
  { label: "Shipped",          icon: Truck        },
  { label: "Out for Delivery", icon: MapPin       },
  { label: "Delivered",        icon: CheckCircle2 },
]

const PORTAL_TABS = [
  { id: "track",       label: "Track Package",        icon: Truck    },
  { id: "preferences", label: "Delivery Preferences", icon: Settings },
  { id: "return",      label: "Request Return",        icon: Undo2    },
  { id: "rate",        label: "Rate Delivery",         icon: Star     },
] as const
type PortalTab = typeof PORTAL_TABS[number]["id"]

const TIME_WINDOWS = ["8AM – 10AM", "10AM – 12PM", "12PM – 2PM", "2PM – 4PM", "4PM – 6PM", "6PM – 8PM"]

export function ClientPortal() {
  const api = React.useMemo(() => getProvider(), [])
  const { messages, addMessage } = useMessages()

  const [activeTab, setActiveTab] = React.useState<PortalTab>("track")
  const [trackingNumber, setTrackingNumber] = React.useState("")
  const [isTracking, setIsTracking]         = React.useState(false)
  const [lookupLoading, setLookupLoading]   = React.useState(false)
  const [lookupError, setLookupError]       = React.useState(false)
  const [foundOrder, setFoundOrder]         = React.useState<Order | null>(null)
  const [orderLines, setOrderLines]         = React.useState<OrderLine[]>([])
  const [chatInput, setChatInput]           = React.useState("")
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Preferences state
  const [prefWindow, setPrefWindow]             = React.useState("2PM – 4PM")
  const [prefInstructions, setPrefInstructions] = React.useState("")
  const [prefNeighbor, setPrefNeighbor]         = React.useState(false)
  const [prefNeighborName, setPrefNeighborName] = React.useState("")
  const [prefSaved, setPrefSaved]               = React.useState(false)

  // Return wizard state
  const [returnStep, setReturnStep]           = React.useState(0)
  const [selectedItems, setSelectedItems]     = React.useState<string[]>([])
  const [returnReason, setReturnReason]       = React.useState("")
  const [returnSubmitted, setReturnSubmitted] = React.useState(false)

  // Rating state
  const [rating, setRating]                   = React.useState(0)
  const [hoverRating, setHoverRating]         = React.useState(0)
  const [ratingComment, setRatingComment]     = React.useState("")
  const [ratingSubmitted, setRatingSubmitted] = React.useState(false)

  const activeTracking = foundOrder?.id ?? trackingNumber
  const currentStep    = foundOrder ? STATUS_STEP[foundOrder.status] : 3
  const returnableItems = orderLines.length > 0
    ? orderLines.map(l => ({ name: l.name, qty: l.qty }))
    : FALLBACK_ITEMS

  const threadMessages = React.useMemo(
    () => [...messages].filter(m => m.trackingNumber === activeTracking).reverse(),
    [messages, activeTracking]
  )

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [threadMessages.length])

  const handleTrack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = trackingNumber.trim()
    if (!id) return

    setIsTracking(true)
    setLookupLoading(true)
    setLookupError(false)
    setFoundOrder(null)
    setOrderLines([])

    try {
      const all = await api.orders.getAllOrders()
      const order = all.find(o => o.id.toLowerCase() === id.toLowerCase())
      if (!order) {
        setLookupError(true)
      } else {
        const lines = await api.orders.getOrderLines(order.id)
        setFoundOrder(order)
        setOrderLines(lines)
      }
    } catch {
      setLookupError(true)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleReset = () => {
    setIsTracking(false)
    setLookupError(false)
    setFoundOrder(null)
    setOrderLines([])
  }

  const handleSendMessage = () => {
    const text = chatInput.trim()
    if (!text) return
    addMessage({ senderName: `Customer · ${activeTracking}`, text, trackingNumber: activeTracking })
    setChatInput("")
  }

  const toggleItem = (name: string) =>
    setSelectedItems(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])

  const RETURN_REASONS = ["Wrong item received", "Item damaged", "Changed my mind", "Duplicate order", "Better price elsewhere", "Other"]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Customer Portal</h2>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">End Customer View</Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {PORTAL_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TRACK TAB ── */}
      {activeTab === "track" && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 min-h-[560px] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-40 dark:opacity-10" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10 w-full max-w-2xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 mb-6">
                <Truck className="h-8 w-8" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Track Your Package</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Enter your order ID for real-time updates.</p>
            </div>

            {!isTracking ? (
              <Card className="border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50">
                <CardContent className="p-2">
                  <form onSubmit={handleTrack} className="flex items-center">
                    <Search className="h-6 w-6 text-slate-400 ml-4 mr-2" />
                    <input
                      type="text"
                      placeholder="e.g. ORD-5001"
                      className="flex-1 h-14 bg-transparent border-none outline-none text-lg placeholder:text-slate-400 font-medium dark:text-slate-100"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                    />
                    <Button type="submit" size="lg" className="h-14 px-8 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-xl" disabled={!trackingNumber.trim()}>
                      Track
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : lookupLoading ? (
              /* ── Loading ── */
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Looking up your order…</p>
              </div>
            ) : lookupError ? (
              /* ── Not Found ── */
              <Card className="border-red-100 dark:border-red-900">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-950 text-red-500 mx-auto">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Order Not Found</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    No order found for <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{trackingNumber}</span>. Check the ID and try again.
                  </p>
                  <Button variant="outline" onClick={handleReset}>
                    ← Try another order
                  </Button>
                </CardContent>
              </Card>
            ) : foundOrder ? (
              /* ── Order Found ── */
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" onClick={handleReset} className="text-slate-500 -ml-4">
                    ← Track another
                  </Button>
                  <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{foundOrder.id}</span>
                </div>

                {/* Status Card */}
                <Card className="border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                  <div className={`${STATUS_HEADER_CLS[foundOrder.status]} p-6 text-white flex justify-between items-center`}>
                    <div>
                      <p className="text-white/70 text-sm uppercase tracking-wider mb-1">Current Status</p>
                      <h2 className="text-3xl font-bold">{STATUS_LABEL[foundOrder.status]}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-sm uppercase tracking-wider mb-1">
                        {foundOrder.status === "delivered" ? "Delivered to" : "Destination"}
                      </p>
                      <h2 className="text-lg font-bold max-w-[180px] text-right leading-tight">{foundOrder.destination}</h2>
                    </div>
                  </div>
                  <CardContent className="p-8 dark:bg-slate-800">
                    {/* Progress Steps */}
                    <div className="relative flex justify-between items-center mb-12">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full z-0" />
                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-500 ${
                          foundOrder.status === "delivered" ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${(currentStep / 4) * 100}%` }}
                      />
                      {TRACK_STEPS.map((step, i) => {
                        const done    = i < currentStep
                        const current = i === currentStep
                        return (
                          <div key={i} className="relative z-10 flex flex-col items-center">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-sm transition-all ${
                              current
                                ? (foundOrder.status === "delivered" ? "bg-emerald-500 text-white scale-110" : "bg-blue-600 text-white scale-110")
                                : done
                                  ? (foundOrder.status === "delivered" ? "bg-emerald-400 text-white" : "bg-blue-500 text-white")
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                            }`}>
                              <step.icon className="h-5 w-5" />
                            </div>
                            <span className={`absolute -bottom-8 text-xs font-bold whitespace-nowrap ${
                              current ? "text-blue-700 dark:text-blue-400" : done ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Delivery Address</p>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">{foundOrder.destination}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Driver Card — shown only when shipped or delivered */}
                {(foundOrder.status === "shipped" || foundOrder.status === "delivered") && (
                  <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                    <CardContent className="p-5 dark:bg-slate-800">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Your Driver</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                              {MOCK_DRIVER.initials}
                            </div>
                            <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 border-2 border-white rounded-full ${foundOrder.status === "delivered" ? "bg-slate-400" : "bg-emerald-500"}`} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{MOCK_DRIVER.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{MOCK_DRIVER.vehicle}</p>
                            <div className="flex items-center mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(MOCK_DRIVER.rating) ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                              ))}
                              <span className="ml-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">{MOCK_DRIVER.rating}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-10 px-4">
                          <Phone className="h-4 w-4 mr-2" /> Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order Items */}
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardContent className="p-5 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Order</p>
                      <Badge variant="secondary">{foundOrder.items} item{foundOrder.items !== 1 ? "s" : ""}</Badge>
                    </div>
                    {orderLines.length > 0 ? (
                      <div className="space-y-2.5">
                        {orderLines.map((line, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <Package className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{line.name}</span>
                                <p className="text-xs text-slate-400 font-mono">{line.sku}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">× {line.qty}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">{foundOrder.items} package{foundOrder.items !== 1 ? "s" : ""} in this order.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Message Driver — shown only when in transit */}
                {foundOrder.status === "shipped" && (
                  <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                    <CardContent className="p-5 dark:bg-slate-800">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Message Driver</p>
                      </div>
                      {threadMessages.length > 0 ? (
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                          {threadMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-start" : "justify-end"}`}>
                              {msg.direction === "outbound" && (
                                <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-2 shrink-0 self-end">
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">D</span>
                                </div>
                              )}
                              <div className={`text-sm px-4 py-2.5 rounded-2xl max-w-[75%] shadow-sm ${
                                msg.direction === "outbound"
                                  ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm"
                                  : "bg-blue-600 text-white rounded-br-sm"
                              }`}>
                                {msg.direction === "outbound" && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Driver</p>}
                                <p>{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-slate-400" : "text-blue-200 text-right"}`}>
                                  {msg.timestamp}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">Send a note to your driver — e.g. leave at the door, ring bell, etc.</p>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          className="flex-1 h-11 px-4 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 dark:text-slate-200"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage} disabled={!chatInput.trim()} className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── DELIVERY PREFERENCES TAB ── */}
      {activeTab === "preferences" && (
        <div className="space-y-4 max-w-xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Set your delivery preferences for future and upcoming orders.</p>

          {prefSaved && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />Preferences saved successfully.
            </div>
          )}

          {/* Time Window */}
          <Card className="dark:border-slate-700">
            <CardContent className="p-5 space-y-3 dark:bg-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Preferred Delivery Window</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">We'll try to schedule deliveries within your preferred time window.</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_WINDOWS.map(w => (
                  <button
                    key={w}
                    onClick={() => setPrefWindow(w)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      prefWindow === w
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Instructions */}
          <Card className="dark:border-slate-700">
            <CardContent className="p-5 space-y-3 dark:bg-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Delivery Instructions</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Leave specific notes for your driver (gate code, building access, etc.).</p>
              <textarea
                rows={3}
                value={prefInstructions}
                onChange={e => setPrefInstructions(e.target.value)}
                placeholder="e.g. Leave at the front door. Ring bell twice. Gate code: 1234."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none placeholder:text-slate-400 dark:text-slate-200"
              />
            </CardContent>
          </Card>

          {/* Authorize Neighbor */}
          <Card className="dark:border-slate-700">
            <CardContent className="p-5 space-y-3 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Authorize a Neighbor</p>
                </div>
                <button
                  onClick={() => setPrefNeighbor(!prefNeighbor)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${prefNeighbor ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefNeighbor ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Allow a trusted neighbor to accept the package on your behalf.</p>
              {prefNeighbor && (
                <input
                  type="text"
                  value={prefNeighborName}
                  onChange={e => setPrefNeighborName(e.target.value)}
                  placeholder="Neighbor's name (e.g. Jane Smith, Apt 4B)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400 dark:text-slate-200"
                />
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 3000) }}
          >
            Save Preferences
          </Button>
        </div>
      )}

      {/* ── RETURN REQUEST TAB ── */}
      {activeTab === "return" && (
        <div className="max-w-xl space-y-4">
          {returnSubmitted ? (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-8 text-center space-y-4 dark:bg-slate-800">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Return Authorized</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Your return auth number is <span className="font-mono font-bold text-slate-900 dark:text-slate-100">RMA-{Math.floor(100000 + Math.random() * 900000)}</span>. A prepaid shipping label has been sent to your email.</p>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-left space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p><span className="font-medium">Items:</span> {selectedItems.join(", ")}</p>
                  <p><span className="font-medium">Reason:</span> {returnReason}</p>
                  <p><span className="font-medium">Next step:</span> Pack items securely and drop off at any authorized location.</p>
                </div>
                <Button variant="outline" onClick={() => { setReturnSubmitted(false); setReturnStep(0); setSelectedItems([]); setReturnReason("") }}>
                  Start Another Return
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm">
                {["Select Items", "Reason", "Confirm"].map((label, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-1.5 ${i === returnStep ? "text-blue-700 dark:text-blue-400 font-semibold" : i < returnStep ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i === returnStep ? "border-blue-600 bg-blue-600 text-white" : i < returnStep ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 dark:border-slate-600"}`}>
                        {i < returnStep ? <CheckSquare className="h-3 w-3" /> : i + 1}
                      </div>
                      {label}
                    </div>
                    {i < 2 && <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />}
                  </React.Fragment>
                ))}
              </div>

              {returnStep === 0 && (
                <Card className="dark:border-slate-700">
                  <CardContent className="p-5 space-y-4 dark:bg-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Which items would you like to return?</p>
                    {orderLines.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">Track your order first to see your actual items, or select from the sample list below.</p>
                    )}
                    <div className="space-y-2">
                      {returnableItems.map(item => (
                        <button
                          key={item.name}
                          onClick={() => toggleItem(item.name)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            selectedItems.includes(item.name)
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                              : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            selectedItems.includes(item.name) ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-500"
                          }`}>
                            {selectedItems.includes(item.name) && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                          <span className="ml-auto text-xs text-slate-400">× {item.qty}</span>
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={selectedItems.length === 0}
                      onClick={() => setReturnStep(1)}
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {returnStep === 1 && (
                <Card className="dark:border-slate-700">
                  <CardContent className="p-5 space-y-4 dark:bg-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Why are you returning these items?</p>
                    <div className="space-y-2">
                      {RETURN_REASONS.map(reason => (
                        <button
                          key={reason}
                          onClick={() => setReturnReason(reason)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors text-sm ${
                            returnReason === reason
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                              : "border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${returnReason === reason ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-500"}`} />
                          {reason}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setReturnStep(0)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Back
                      </Button>
                      <Button className="flex-1" disabled={!returnReason} onClick={() => setReturnStep(2)}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {returnStep === 2 && (
                <Card className="dark:border-slate-700">
                  <CardContent className="p-5 space-y-4 dark:bg-slate-800">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p className="text-sm">Please ensure items are in original packaging where possible.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-2 text-sm">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Return Summary</p>
                      <p className="text-slate-600 dark:text-slate-300"><span className="font-medium">Items:</span> {selectedItems.join(", ")}</p>
                      <p className="text-slate-600 dark:text-slate-300"><span className="font-medium">Reason:</span> {returnReason}</p>
                      {foundOrder && <p className="text-slate-600 dark:text-slate-300"><span className="font-medium">Order:</span> {foundOrder.id}</p>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">By submitting, you agree to our return policy. A prepaid label will be sent to your email within 15 minutes.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setReturnStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Back
                      </Button>
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => setReturnSubmitted(true)}>
                        Submit Return Request
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RATE DELIVERY TAB ── */}
      {activeTab === "rate" && (
        <div className="max-w-xl">
          {ratingSubmitted ? (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-8 text-center space-y-3 dark:bg-slate-800">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-500 mx-auto">
                  <Star className="h-8 w-8 fill-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Thank you for your feedback!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Your rating helps us improve our delivery service.</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-6 w-6 ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="dark:border-slate-700">
              <CardContent className="p-6 space-y-6 dark:bg-slate-800">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Rate your delivery experience</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {foundOrder ? `Order ${foundOrder.id} · ` : ""}{MOCK_DRIVER.name}
                  </p>
                </div>

                {/* Star selector */}
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-125"
                    >
                      <Star className={`h-10 w-10 transition-colors ${star <= (hoverRating || rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-600"}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">
                    {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                  </p>
                )}

                {/* Comment */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Leave a comment (optional)</p>
                  <textarea
                    rows={4}
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    placeholder="Tell us about your experience..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none placeholder:text-slate-400 dark:text-slate-200"
                  />
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={rating === 0}
                  onClick={() => setRatingSubmitted(true)}
                >
                  Submit Rating
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
