"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, ChevronDown, ChevronRight, Camera, CheckCircle2, AlertCircle, PackageX, Loader2 } from "lucide-react"
import { Return, ReturnItem } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

export function ReturnsDashboard() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [expandedReturn, setExpandedReturn] = React.useState<string | null>(null)
  const [disposition, setDisposition] = React.useState<string>("")
  const [returns, setReturns] = React.useState<Return[]>([])
  const [returnLinesMap, setReturnLinesMap] = React.useState<Record<string, ReturnItem[]>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await api.returns.getReturnsByTenant(selectedTenant.id)
      setReturns(data)
      setLoading(false)
    }
    loadData()
  }, [api, selectedTenant.id])

  const toggleExpand = async (id: string) => {
    if (expandedReturn === id) {
      setExpandedReturn(null)
    } else {
      setExpandedReturn(id)
      setDisposition("") // Reset disposition when opening a new one
      if (!returnLinesMap[id]) {
        const lines = await api.returns.getReturnLines(id)
        setReturnLinesMap(prev => ({ ...prev, [id]: lines }))
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>
      case "inspecting": return <Badge variant="outline" className="border-amber-500 text-amber-500">Inspecting</Badge>
      case "completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDispositionBadge = (disp: string) => {
    switch (disp) {
      case "Restock": return <Badge variant="outline" className="border-blue-500 text-blue-500">Restock</Badge>
      case "Refurbish": return <Badge variant="outline" className="border-purple-500 text-purple-500">Refurbish</Badge>
      case "Scrap": return <Badge variant="outline" className="border-red-500 text-red-500">Scrap</Badge>
      case "Return to Vendor": return <Badge variant="outline" className="border-slate-500 text-slate-500">RTV</Badge>
      default: return <span className="text-slate-400">-</span>
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Returns Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">Export Report</Button>
          <Button>Initiate Return</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <PackageX className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-slate-500">Awaiting inspection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Inspection</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">5</div>
            <p className="text-xs text-slate-500">Currently being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restocked (MTD)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">84</div>
            <p className="text-xs text-slate-500">Items returned to inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scrapped (MTD)</CardTitle>
            <PackageX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">14</div>
            <p className="text-xs text-slate-500">Items marked as scrap</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Returns Queue</CardTitle>
            <CardDescription>Process incoming returns, inspect items, and determine disposition.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search returns, orders..."
                className="h-9 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Return ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Disposition</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((ret) => (
                <React.Fragment key={ret.id}>
                  <TableRow className={`${expandedReturn === ret.id ? 'bg-slate-50' : ''}`}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(ret.id)} className="h-6 w-6">
                        {expandedReturn === ret.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{ret.id}</TableCell>
                    <TableCell className="text-slate-500">{ret.orderId}</TableCell>
                    <TableCell>{ret.client}</TableCell>
                    <TableCell>{ret.date}</TableCell>
                    <TableCell>{ret.reason}</TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell>{getDispositionBadge(ret.disposition)}</TableCell>
                    <TableCell className="text-right">
                      {ret.status !== "completed" ? (
                        <Button size="sm" onClick={() => toggleExpand(ret.id)}>Inspect</Button>
                      ) : (
                        <Button size="sm" variant="ghost">View Details</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedReturn === ret.id && (
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableCell colSpan={9} className="p-0">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-3 gap-8">
                            
                            {/* Left Column: Items */}
                            <div className="col-span-1 border-r border-slate-200 pr-8">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 text-sm">Returned Items</h4>
                              <div className="space-y-3">
                                {returnLinesMap[ret.id] && returnLinesMap[ret.id].length > 0 ? returnLinesMap[ret.id].map((line: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{line.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1">{line.sku}</p>
                                      </div>
                                      <Badge variant="secondary">Qty: {line.qty}</Badge>
                                    </div>
                                    <div className="mt-3 text-xs text-slate-500">
                                      Reported Condition: <span className="font-medium text-slate-700">{line.condition}</span>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="text-sm text-slate-500 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Loading item details...
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Middle & Right Column: Inspection Workflow */}
                            <div className="col-span-2">
                              {ret.status !== "completed" ? (
                                <div>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Inspection Workflow</h4>
                                    <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-50">Action Required</Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-6">
                                    {/* Checklist */}
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">Condition Checklist</label>
                                        <div className="space-y-2">
                                          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                            <span>Original packaging intact</span>
                                          </label>
                                          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                            <span>All parts & accessories included</span>
                                          </label>
                                          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                            <span>Signs of wear or use</span>
                                          </label>
                                          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                            <span>Visible damage</span>
                                          </label>
                                        </div>
                                      </div>

                                      <div className="space-y-2 pt-2">
                                        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">Photos</label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-md p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-400 cursor-pointer transition-colors">
                                          <Camera className="h-6 w-6 mb-2" />
                                          <span className="text-xs font-medium">Upload Inspection Photos</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Disposition */}
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">Determine Disposition</label>
                                        <div className="space-y-2">
                                          {[
                                            { id: "restock", label: "Restock", desc: "Return to active inventory" },
                                            { id: "refurbish", label: "Refurbish", desc: "Send to repair/repackaging" },
                                            { id: "scrap", label: "Scrap", desc: "Dispose of item" },
                                            { id: "rtv", label: "Return to Vendor", desc: "Send back to manufacturer" }
                                          ].map((opt) => (
                                            <label 
                                              key={opt.id} 
                                              className={`flex items-start space-x-3 p-3 border rounded-md cursor-pointer transition-colors ${disposition === opt.id ? 'border-slate-900 bg-slate-50 dark:border-slate-400 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                                            >
                                              <input 
                                                type="radio" 
                                                name="disposition" 
                                                value={opt.id}
                                                checked={disposition === opt.id}
                                                onChange={() => setDisposition(opt.id)}
                                                className="mt-1 border-slate-300 text-slate-900 focus:ring-slate-900" 
                                              />
                                              <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</div>
                                                <div className="text-xs text-slate-500">{opt.desc}</div>
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="pt-4 flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setExpandedReturn(null)}>Cancel</Button>
                                        <Button
                                          disabled={!disposition}
                                          onClick={async () => {
                                            if (!disposition) return
                                            const dispLabel = disposition === "rtv" ? "Return to Vendor" : disposition.charAt(0).toUpperCase() + disposition.slice(1)
                                            await api.returns.updateReturnDisposition(ret.id, "completed", dispLabel)
                                            setReturns(prev => prev.map(r => r.id === ret.id ? { ...r, status: "completed" as const, disposition: dispLabel } : r))
                                            setExpandedReturn(null)
                                          }}
                                        >Complete Inspection</Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Inspection Completed</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This return has been processed and marked as <span className="font-medium text-slate-900 dark:text-slate-100">{ret.disposition}</span>.</p>
                                  </div>
                                  <Button variant="outline" size="sm" className="mt-2">View Full Report</Button>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
