"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScanLine, MapPin, Package, CheckCircle2, ArrowLeft, Camera, AlertCircle, ChevronRight, Loader2, ListTodo, Search, User } from "lucide-react"
import { Task } from "@/types"
import { getProvider } from "@/data"
import { useDemo } from "@/context/DemoContext"

export function MobileWorkerApp() {
  const api = React.useMemo(() => getProvider(), [])
  const { selectedTenant } = useDemo()
  const [activeTab, setActiveTab] = React.useState("pending")
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const [scanState, setScanState] = React.useState<"idle" | "scanning" | "success">("idle")
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await api.tasks.getTasksByTenant(selectedTenant.id)
      setTasks(data)
      setLoading(false)
    }
    loadData()
  }, [api, selectedTenant.id])

  const handleStartTask = (task: Task) => {
    setActiveTask(task)
    setScanState("idle")
  }

  const handleSimulateScan = () => {
    setScanState("scanning")
    setTimeout(() => {
      setScanState("success")
    }, 1500)
  }

  const handleCompleteTask = () => {
    setActiveTask(null)
    setScanState("idle")
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Warehouse Worker App</h2>
        <p className="text-slate-500 dark:text-slate-400">Interactive mobile mockup for floor employees.</p>
      </div>

      {/* Mobile Device Frame */}
      <div className="w-full max-w-[400px] h-[800px] bg-slate-50 border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col">
        
        {/* Status Bar Mock */}
        <div className="h-7 bg-slate-900 w-full flex items-center justify-between px-6 text-[10px] text-white font-medium">
          <span>9:41</span>
          <div className="flex space-x-1">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* App Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : !activeTask ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 pb-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-xl font-bold">My Tasks</h1>
                  <p className="text-slate-400 text-sm">Zone A • Morning Shift</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <span className="font-bold">JD</span>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
                <button 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending' ? 'bg-white text-slate-900' : 'text-slate-300'}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending ({tasks.filter(t => t.status === 'pending').length})
                </button>
                <button 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'completed' ? 'bg-white text-slate-900' : 'text-slate-300'}`}
                  onClick={() => setActiveTab('completed')}
                >
                  Done ({tasks.filter(t => t.status === 'completed').length})
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tasks.filter(t => activeTab === 'pending' ? t.status !== 'completed' : t.status === 'completed').map(task => (
                <Card key={task.id} className="border-slate-200 shadow-sm overflow-hidden" onClick={() => handleStartTask(task)}>
                  <div className={`h-1.5 w-full ${task.type === 'Pick' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={task.type === 'Pick' ? 'default' : 'secondary'} className={task.type === 'Pick' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                        {task.type}
                      </Badge>
                      {(task.priority === 'high' || task.priority === 'urgent') && (
                        <span className="flex items-center text-xs font-bold text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" /> URGENT
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{task.id}</h3>
                    <div className="flex items-center text-slate-600 text-sm mb-3">
                      <MapPin className="h-4 w-4 mr-1.5 text-slate-400" />
                      {task.location}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                      <div className="flex items-center text-slate-600 text-sm">
                        <Package className="h-4 w-4 mr-1.5 text-slate-400" />
                        {task.items} Items
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full bg-slate-50">
            {/* Active Task Header */}
            <div className={`p-4 text-white flex items-center ${activeTask.type === 'Pick' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              <button onClick={() => setActiveTask(null)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h2 className="font-bold text-lg">{activeTask.type} Task</h2>
                <p className="text-white/80 text-sm">{activeTask.id}</p>
              </div>
            </div>

            {/* Location Guide */}
            <div className="bg-white p-6 border-b border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Go to Location</p>
              <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                <MapPin className="h-6 w-6 mr-2 text-slate-400" />
                {activeTask.location.split(' • ').pop()}
              </h3>
              <p className="text-slate-500 mt-1">{activeTask.location}</p>
            </div>

            {/* Item Details */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Wireless Earbuds</h4>
                    <p className="text-slate-500 font-mono text-sm mt-1">SKU-1001</p>
                  </div>
                  <div className="bg-slate-100 px-3 py-1 rounded-lg text-center">
                    <span className="block text-xs text-slate-500 font-medium uppercase">Qty</span>
                    <span className="block text-xl font-bold text-slate-900">{activeTask.items}</span>
                  </div>
                </div>
                
                {scanState === "idle" && (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <ScanLine className="h-10 w-10 text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-700">Scan item barcode to confirm</p>
                  </div>
                )}

                {scanState === "scanning" && (
                  <div className="bg-slate-900 rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                    <div className="h-0.5 w-full bg-emerald-500 absolute top-1/2 left-0 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-[bounce_2s_infinite]" />
                    <Camera className="h-10 w-10 text-white mb-3 relative z-10" />
                    <p className="text-sm font-medium text-white relative z-10">Scanning...</p>
                  </div>
                )}

                {scanState === "success" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-emerald-800">Match Confirmed!</p>
                    <p className="text-xs text-emerald-600 mt-1">Ready to complete task</p>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-3">
                {scanState !== "success" ? (
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800" 
                    onClick={handleSimulateScan}
                    disabled={scanState === "scanning"}
                  >
                    <ScanLine className="mr-2 h-5 w-5" />
                    Simulate Scan
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white" 
                    onClick={handleCompleteTask}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Task
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        {!activeTask && (
          <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 pb-2">
            <button className="flex flex-col items-center justify-center w-16 h-full text-slate-900">
              <ListTodo className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-medium">Tasks</span>
            </button>
            <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-600">
              <Search className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-medium">Lookup</span>
            </button>
            <button className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-slate-600">
              <User className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
