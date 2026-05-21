"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts"
import { 
  Cpu, TrendingUp, Inbox, AlertTriangle, CheckCircle, ShieldAlert,
  Percent, Clock, RefreshCw
} from "lucide-react"

interface KeyMetrics {
  total_emails: number
  pending_actions: number
  resolved_threads: number
  high_risk_contacts: number
  sla_compliance_rate: number
}

interface AnalyticsData {
  sentiment_trend: Array<{ date: string; avg_sentiment: number; count: number }>
  category_distribution: Array<{ name: string; value: number }>
  urgency_distribution: Array<{ name: string; value: number }>
  status_distribution: Array<{ name: string; value: number }>
  key_metrics: KeyMetrics
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // Poll analytics every 8 seconds
    const timer = setInterval(fetchAnalytics, 8000)
    return () => clearInterval(timer)
  }, [])

  // Color lists for charts
  const COLORS = ["#0e90eb", "#7cc8fc", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-slate-950/40 p-6 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Operations Control & Live Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Real-time sentiment insights, RAG volume metrics, and autonomous agent triage performance.
            </p>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchAnalytics() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            id="refresh-analytics-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </header>

        {loading || !data ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-3">
            <Cpu className="w-12 h-12 text-brand-500 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-xs text-slate-400">Aggregating CRM intelligence analytics...</span>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Ingested Volume */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Ingested</span>
                    <span className="text-2xl font-bold text-slate-100 mt-1 block">
                      {data.key_metrics.total_emails}
                    </span>
                  </div>
                  <div className="p-2 bg-brand-600/10 rounded-lg text-brand-400">
                    <Inbox className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-[10px] text-brand-400 mt-3 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +100% ingest rate
                </div>
              </div>

              {/* Card 2: Pending Human Actions */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Awaiting Action</span>
                    <span className={`text-2xl font-bold mt-1 block ${data.key_metrics.pending_actions > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {data.key_metrics.pending_actions}
                    </span>
                  </div>
                  <div className="p-2 bg-amber-600/10 rounded-lg text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-3">
                  Drafted replies requiring approval
                </div>
              </div>

              {/* Card 3: Resolved by Autopilot */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Autopilot Resolved</span>
                    <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                      {data.key_metrics.resolved_threads}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-600/10 rounded-lg text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-3">
                  SLA auto-resolutions sent
                </div>
              </div>

              {/* Card 4: VIP Churn Risk */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">VIP Churn Flag</span>
                    <span className={`text-2xl font-bold mt-1 block ${data.key_metrics.high_risk_contacts > 0 ? "text-rose-400" : "text-slate-100"}`}>
                      {data.key_metrics.high_risk_contacts}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-600/10 rounded-lg text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-[10px] text-rose-400 mt-3 font-semibold animate-pulse">
                  High-risk account flags
                </div>
              </div>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Sentiment Trend Line */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-brand-400" /> Customer Sentiment Trend (L2 Analytics)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.sentiment_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                      <YAxis domain={[-1, 1]} stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderColor: '#334155', fontSize: 11 }} 
                        labelClassName="text-slate-400"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avg_sentiment" 
                        stroke="#0e90eb" 
                        strokeWidth={2.5} 
                        dot={{ fill: '#0e90eb', strokeWidth: 2 }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Category Breakdown Bar */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-brand-400" /> Intent Classification Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderColor: '#334155', fontSize: 11 }} 
                      />
                      <Bar dataKey="value" fill="#7cc8fc" radius={[4, 4, 0, 0]}>
                        {data.category_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SLA Metrics and Urgency Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Urgency breakdown */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 lg:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Urgency Priorities
                </h3>
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.urgency_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.urgency_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', fontSize: 11 }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} fontSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 lg:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Thread Lifecycle States
                </h3>
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.status_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.status_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', fontSize: 11 }} />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} fontSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Operations SLA Performance */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 lg:col-span-1 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  SLA Service Level Target
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <Percent className="w-4 h-4 text-emerald-400" />
                      <span>SLA Compliance Goal</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{data.key_metrics.sla_compliance_rate}%</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <Clock className="w-4 h-4 text-brand-400" />
                      <span>Avg. Resolution SLA</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200">12.5 mins</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <Cpu className="w-4 h-4 text-brand-400 animate-pulse" />
                      <span>Autopilot Share Rate</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200">42%</span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 leading-normal bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    💡 **Triage Insight**: High-risk VIP Churn and Security ransomware notifications bypass auto-reply mechanisms instantly and trigger compliance escalations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
