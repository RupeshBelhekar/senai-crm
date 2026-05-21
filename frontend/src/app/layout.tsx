import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "SenAI Mission Control - Agentic CRM Intelligence",
  description: "Autonomous CRM operations featuring heuristic and LLM multi-layer triage, pgvector RAG grounding, and automatic response generation.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>" />
      </head>
      <body className={`${inter.variable} font-sans antialiased text-slate-100 bg-slate-950 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
