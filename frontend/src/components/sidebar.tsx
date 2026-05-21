"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, BarChart2, ShieldCheck, Cpu, Wifi, Activity } from "lucide-react"
import { useState, useEffect } from "react"

export default function Sidebar() {
  const pathname = usePathname()
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`)
        if (res.ok) {
          setApiOnline(true)
        } else {
          setApiOnline(false)
        }
      } catch (err) {
        setApiOnline(false)
      }
    }
    checkHealth()
    const timer = setInterval(checkHealth, 10000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { name: "Mission Control", path: "/", icon: Inbox },
    { name: "Intelligence & Analytics", path: "/analytics", icon: BarChart2 }
  ]

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between p-4 min-h-screen">
      <div>
        {/* Header Branding */}
        <div className="flex items-center space-x-2.5 px-2 py-4 mb-6">
          <div className="p-2 bg-brand-600/20 border border-brand-500/30 rounded-lg text-brand-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SenAI CRM
            </h1>
            <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">
              Agentic Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                id={`sidebar-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-600/15 text-brand-400 border border-brand-500/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* System Status Indicators */}
      <div className="glass-panel rounded-xl p-3 border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400">LLM Triage Engine</span>
          <span className="text-brand-400 flex items-center gap-1 font-medium">
            <Activity className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Gemini 1.5
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">System Status</span>
          <span className="flex items-center gap-1.5 font-medium">
            <Wifi className={`w-3.5 h-3.5 ${apiOnline ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
            {apiOnline === null ? (
              <span className="text-slate-400">Verifying...</span>
            ) : apiOnline ? (
              <span className="text-emerald-400">Online</span>
            ) : (
              <span className="text-rose-400">Offline</span>
            )}
          </span>
        </div>
      </div>
    </aside>
  )
}
