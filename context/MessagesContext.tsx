"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

export type DriverMessage = {
  id: string
  conversationId: string // grouped by trackingNumber
  senderName: string
  text: string
  trackingNumber: string
  timestamp: string
  direction: "inbound" | "outbound" // inbound = customer→driver, outbound = driver→customer
}

interface MessagesContextType {
  messages: DriverMessage[]
  addMessage: (msg: Omit<DriverMessage, "id" | "timestamp" | "conversationId" | "direction">) => void
  addReply: (trackingNumber: string, text: string) => void
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined)

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<DriverMessage[]>([])

  const addMessage = (msg: Omit<DriverMessage, "id" | "timestamp" | "conversationId" | "direction">) => {
    const newMsg: DriverMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      conversationId: msg.trackingNumber,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      direction: "inbound",
    }
    setMessages((prev) => [newMsg, ...prev])
  }

  const addReply = (trackingNumber: string, text: string) => {
    const newMsg: DriverMessage = {
      id: `msg-${Date.now()}`,
      conversationId: trackingNumber,
      senderName: "Driver",
      text,
      trackingNumber,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      direction: "outbound",
    }
    setMessages((prev) => [...prev, newMsg])
  }

  return (
    <MessagesContext.Provider value={{ messages, addMessage, addReply }}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessagesContext)
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }
  return context
}
