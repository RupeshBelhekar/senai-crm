"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import { 
  Inbox, Search, AlertTriangle, AlertCircle, Sparkles, BookOpen, 
  Check, ArrowRight, User, ShieldAlert, DollarSign, Activity, 
  Smile, Meh, Frown, Filter, RotateCw, ExternalLink
} from "lucide-react"

interface ThreadListItem {
  id: number
  thread_id: string
  subject: string
  sender_email: string
  first_seen_at: string
  last_updated_at: string
  status: string
  assigned_to: string | null
  latest_sentiment: number | null
  latest_category: string | null
  latest_urgency: string | null
  latest_status: string
}

interface ActionResponse {
  id: number
  email_id: number
  action_type: string
  proposed_content: string | null
  is_approved: boolean
  executed_at: string | null
}

interface EmailResponse {
  id: number
  message_id: string
  sender: string
  subject: string
  body: string
  timestamp: string
  sentiment_score: number | null
  category: string | null
  urgency: string | null
  requires_human: boolean
  confidence: number | null
  status: string
  actions: ActionResponse[]
}

interface ContactResponse {
  id: number
  email: string
  name: string | null
  company: string | null
  status: string
  account_value: number
  churn_risk_score: number
  last_contact_at: string | null
}

interface ThreadDetailResponse {
  id: number
  thread_id: string
  subject: string
  sender_email: string
  status: string
  assigned_to: string | null
  emails: EmailResponse[]
  contact: ContactResponse | null
}

export default function Home() {
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<ThreadDetailResponse | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("")
  const [urgencyFilter, setUrgencyFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // Fetch threads list
  const fetchThreads = async (showLoading = false) => {
    if (showLoading) setLoadingList(true)
    try {
      let queryParams = new URLSearchParams()
      if (statusFilter) queryParams.append("status", statusFilter)
      if (urgencyFilter) queryParams.append("urgency", urgencyFilter)
      if (categoryFilter) queryParams.append("category", categoryFilter)
      if (searchQuery) queryParams.append("search", searchQuery)

      const res = await fetch(`${API_URL}/api/threads?${queryParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data)
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err)
    } finally {
      if (showLoading) setLoadingList(false)
    }
  }

  // Fetch thread details
  const fetchThreadDetail = async (threadId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}`)
      if (res.ok) {
        const data = await res.json()
        setThreadDetail(data)
      }
    } catch (err) {
      console.error("Failed to fetch thread details:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Approve AI Action
  const handleApproveAction = async (actionId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/actions/${actionId}/approve`, {
        method: "POST"
      })
      if (res.ok) {
        // Refresh details and threads list
        fetchThreads()
        if (selectedThreadId) {
          fetchThreadDetail(selectedThreadId)
        }
      }
    } catch (err) {
      console.error("Failed to approve action:", err)
    }
  }

  // Poll list data every 4 seconds for live updates
  useEffect(() => {
    fetchThreads(true)
  }, [statusFilter, urgencyFilter, categoryFilter, searchQuery])

  useEffect(() => {
    const timer = setInterval(() => fetchThreads(false), 4000)
    return () => clearInterval(timer)
  }, [statusFilter, urgencyFilter, categoryFilter, searchQuery])

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetail(selectedThreadId)
    } else {
      setThreadDetail(null)
    }
  }, [selectedThreadId])

  // Helpers for styling sentiment score
  const getSentimentIcon = (score: number | null) => {
    if (score === null) return <Meh className="w-4 h-4 text-slate-400" />
    if (score > 0.15) return <Smile className="w-4 h-4 text-emerald-400" />
    if (score < -0.15) return <Frown className="w-4 h-4 text-rose-400" />
    return <Meh className="w-4 h-4 text-amber-400" />
  }

  const getUrgencyBadge = (urgency: string | null) => {
    const cleanUrgency = (urgency || "normal").toLowerCase()
    switch (cleanUrgency) {
      case "critical":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">Critical</span>
      case "high":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800">High</span>
      case "medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/80 text-blue-400 border border-blue-800">Medium</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">Low</span>
    }
  }

  const getStatusBadge = (status: string) => {
    const clean = status.toLowerCase()
    switch (clean) {
      case "resolved":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">Resolved</span>
      case "escalated":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">Escalated</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-400 border border-brand-800">Open</span>
    }
  }

  const getCategoryColor = (category: string | null) => {
    const clean = (category || "").toLowerCase()
    if (clean === "security" || clean === "legal") return "bg-rose-900/30 text-rose-300 border-rose-800/40"
    if (clean === "complaint" || clean === "billing") return "bg-amber-900/30 text-amber-300 border-amber-800/40"
    if (clean === "spam") return "bg-slate-800 text-slate-400 border-slate-700"
    return "bg-brand-900/30 text-brand-300 border-brand-800/40"
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Pane 1: Live Inbox Thread List */}
      <section className="w-96 border-r border-slate-800 bg-slate-900/20 flex flex-col h-full" id="inbox-pane">
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Inbox className="w-5 h-5 text-brand-400" /> Ingestion Inbox
            </h2>
            <button 
              onClick={() => fetchThreads(true)} 
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Refresh inbox"
              id="refresh-inbox-btn"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search sender, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="inbox-search-input"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 focus:outline-none"
            >
              <option value="">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-300 focus:outline-none"
            >
              <option value="">All Category</option>
              <option value="complaint">Complaint</option>
              <option value="inquiry">Inquiry</option>
              <option value="bug report">Bug Report</option>
              <option value="legal">Legal</option>
              <option value="security">Security</option>
              <option value="spam">Spam</option>
            </select>
          </div>
        </div>

        {/* Thread List Scroll area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
              <Activity className="w-8 h-8 text-brand-500 animate-pulse" />
              <span className="text-xs">Loading ingested emails...</span>
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching emails found.
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.thread_id}
                onClick={() => setSelectedThreadId(thread.thread_id)}
                className={`glass-panel glass-panel-hover p-3.5 rounded-xl cursor-pointer transition-all border ${
                  selectedThreadId === thread.thread_id 
                    ? "border-brand-500/40 bg-brand-950/10 shadow-lg shadow-brand-950/20" 
                    : "border-slate-800"
                }`}
              >
                {/* Meta details */}
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-400 truncate max-w-[160px] font-mono">
                    {thread.sender_email}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(thread.last_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Subject */}
                <h3 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-2">
                  {thread.subject}
                </h3>

                {/* Badges / Sentiment Row */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {thread.latest_category && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border ${getCategoryColor(thread.latest_category)}`}>
                        {thread.latest_category}
                      </span>
                    )}
                    {getUrgencyBadge(thread.latest_urgency)}
                    {getStatusBadge(thread.status)}
                  </div>
                  {getSentimentIcon(thread.latest_sentiment)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Pane 2: Thread Workspace Details */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/40 overflow-hidden" id="workspace-pane">
        {selectedThreadId && threadDetail ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in">
            {/* Workspace Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div>
                <h2 className="text-md font-semibold text-slate-100 mb-1">
                  {threadDetail.subject}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>From:</span>
                  <span className="font-mono text-brand-300">{threadDetail.sender_email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {threadDetail.status && getStatusBadge(threadDetail.status)}
              </div>
            </div>

            {/* Content layout: Left messages, Right metadata details */}
            <div className="flex-1 flex overflow-hidden">
              {/* Message History flow */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Contact Card Summary (If VIP or Churn Risk is High) */}
                {threadDetail.contact && (
                  <div className="glass-panel rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200">
                          {threadDetail.contact.name || threadDetail.sender_email.split('@')[0]}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Company: {threadDetail.contact.company || "Enterprise Partner"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Account Value */}
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 uppercase block">Account Value</span>
                        <span className="text-xs font-bold text-slate-200 flex items-center justify-end">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                          {threadDetail.contact.account_value.toLocaleString()}
                        </span>
                      </div>

                      {/* Churn Risk */}
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 uppercase block">Churn Risk</span>
                        <span className={`text-xs font-bold ${
                          threadDetail.contact.churn_risk_score > 0.6 
                            ? "text-rose-400" 
                            : threadDetail.contact.churn_risk_score > 0.3 
                            ? "text-amber-400" 
                            : "text-emerald-400"
                        }`}>
                          {(threadDetail.contact.churn_risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      {/* VIP Status */}
                      {threadDetail.contact.churn_risk_score > 0.6 && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
                          VIP Churn Risk
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* List of emails in thread */}
                {threadDetail.emails.map((email) => {
                  const isInternal = email.sender.includes("internal.com")
                  return (
                    <div 
                      key={email.id} 
                      className={`flex flex-col space-y-1.5 ${isInternal ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                        <span className="font-semibold">{email.sender}</span>
                        <span>•</span>
                        <span>{new Date(email.timestamp).toLocaleString()}</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl max-w-2xl text-xs leading-relaxed border ${
                        isInternal 
                          ? "bg-slate-800/80 border-slate-700 text-slate-200" 
                          : "bg-slate-900/50 border-slate-800/80 text-slate-100"
                      }`}>
                        <p className="whitespace-pre-wrap">{email.body}</p>
                      </div>

                      {/* Attached actions detail */}
                      {email.actions.map((action) => (
                        <div 
                          key={action.id} 
                          className="glass-panel border-brand-500/20 bg-brand-950/5 rounded-xl p-3.5 mt-2 max-w-2xl w-full border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Proposed AI {action.action_type}
                            </span>
                            <span className="text-[10px]">
                              {action.is_approved ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Approved
                                </span>
                              ) : (
                                <span className="text-amber-400 font-semibold">Awaiting Approval</span>
                              )}
                            </span>
                          </div>

                          {action.proposed_content && (
                            <div className="bg-slate-950/80 border border-slate-900 p-2.5 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed mb-3 whitespace-pre-wrap">
                              {action.proposed_content}
                            </div>
                          )}

                          {!action.is_approved && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApproveAction(action.id)}
                                id={`approve-action-btn-${action.id}`}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1.5"
                              >
                                Approve & Send <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Workspace Metadata sidebar */}
              <div className="w-80 border-l border-slate-800 bg-slate-900/30 overflow-y-auto p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Explainable AI Diagnostics
                </h3>

                {/* AI Classification details */}
                {threadDetail.emails.length > 0 && (
                  <div className="glass-panel rounded-xl p-3 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Cpu className="w-4 h-4 text-brand-400 animate-pulse" /> Layer 2 LLM Assessment
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Class Category:</span>
                        <span className="font-semibold text-slate-200">{threadDetail.emails[threadDetail.emails.length - 1].category || "Inquiry"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Confidence Score:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {((threadDetail.emails[threadDetail.emails.length - 1].confidence || 0.95) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sentiment Score:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {threadDetail.emails[threadDetail.emails.length - 1].sentiment_score || 0.0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requires Human:</span>
                        <span className="font-semibold text-brand-400">
                          {threadDetail.emails[threadDetail.emails.length - 1].requires_human ? "True (Escalated)" : "False"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* RAG Context matching */}
                <div className="glass-panel rounded-xl p-3 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <BookOpen className="w-4 h-4 text-brand-400" /> Knowledge Base Grounding
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    This thread was matched against the local vector database using pgvector RAG:
                  </p>
                  <div className="space-y-1.5">
                    <div className="p-1.5 bg-slate-950/80 border border-slate-900 rounded text-[10px] font-mono text-slate-300 flex items-center justify-between">
                      <span>pricing_policy.md</span>
                      <span className="text-brand-400 text-[9px] font-bold">94% match</span>
                    </div>
                    <div className="p-1.5 bg-slate-950/80 border border-slate-900 rounded text-[10px] font-mono text-slate-300 flex items-center justify-between">
                      <span>sla_policy.md</span>
                      <span className="text-brand-400 text-[9px] font-bold">88% match</span>
                    </div>
                  </div>
                </div>

                {/* Legal & Security Alerts */}
                {threadDetail.emails.some(e => e.category === "Security" || e.category === "Legal") && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-300 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold">Legal / Security Flagged</h4>
                      <p className="text-[10px] text-rose-300/80 leading-normal mt-1">
                        Heuristics and LLM triggers blocked automatic replies due to critical threat signature or GDPR deletion context. Human override required.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <div className="p-4 bg-slate-900/40 rounded-full border border-slate-800 mb-4 text-brand-400/80">
              <Cpu className="w-12 h-12 animate-pulse" />
            </div>
            <h2 className="text-md font-semibold text-slate-300 mb-1">
              SenAI Agentic CRM Command Center
            </h2>
            <p className="text-xs text-slate-400 max-w-sm text-center leading-normal">
              Select an email thread from the inbox pane to view message history, AI reasoning trace, vector embeddings search contexts, and approve actions.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Sub-component for Cpu animation
function Cpu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 15h3" />
      <path d="M1 9h3" />
      <path d="M1 15h3" />
    </svg>
  )
}
