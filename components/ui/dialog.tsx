"use client"

import * as React from "react"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">{children}</div>
    </div>
  )
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

function DialogContent({ className = "", children }: DialogContentProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 p-6 w-full max-h-[90vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}

function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{children}</h2>
}

function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter }
