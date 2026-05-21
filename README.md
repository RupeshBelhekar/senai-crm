# SenAI Agentic CRM Intelligence Platform

This repository contains the solution for the SenAI Technical Assessment.

## Architecture Overview
The platform is built using a modern AI stack designed for scale and intelligence:

- **Backend:** FastAPI, Python 3.11+
- **Database:** PostgreSQL with `pgvector` for RAG embeddings, managed via SQLAlchemy (async).
- **AI/LLM:** Google Gemini API integration via LangChain.
- **Frontend:** Next.js, Tailwind CSS (setup provided in `frontend` folder).
- **Background Jobs:** Configured for Celery + Redis (or FastAPI BackgroundTasks for local testing).

## Components Implemented

1. **Email Ingestion Pipeline:** `POST /api/ingest` handles idempotency (deduplication based on `message_id`), thread grouping, and Contact creation. Layer 1 heuristic triage checks for urgent and security keywords instantly.
2. **Multi-Layer Intelligence:** 
   - *Layer 1:* Synchronous keyword/regex heuristics (implemented in `api/ingest.py`).
   - *Layer 2:* LLM Classification utilizing Gemini (implemented in `services/agent.py`), yielding structured JSON output including sentiment and confidence.
3. **RAG Pipeline:** Uses LangChain with PGVector. The Markdown files in `knowledge_base/` are chunked and embedded to provide contextual groundings for AI Agent responses.
4. **Autonomous Agent:** Reads the entire `Thread History` from the database and combined with the `RAG Context`, outputs a structured reasoning response and suggested reply.

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- Node.js (if running the frontend natively instead of Docker)
- Python 3.11+ (if running backend natively)

### Environment Variables
Create a `.env` file in the `backend` directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql+asyncpg://senai:senai_password@db:5432/senai_crm
```

### Running with Docker Compose
To spin up the PostgreSQL database (with pgvector), Redis, Backend, and Frontend:
```bash
docker-compose up --build
```
The backend API will be available at `http://localhost:8000/docs`.
The frontend will be available at `http://localhost:3000`.

### Seeding the Dataset
Once the backend is running, you can stream the `email-data-advanced.json` using a simple curl loop or python script:
```python
import json, requests
with open('email-data-advanced.json') as f:
    data = json.load(f)
for email in data:
    requests.post('http://localhost:8000/api/ingest', json=email)
```

## Special Scenarios Handled
- **GDPR Requests / Legal Threats:** The LLM classification prompt forces `requires_human=True` for Legal/Compliance categories, overriding any auto-reply.
- **Ransomware:** Layer 1 heuristics immediately catch words like "BTC" and "ransomware", setting `urgency="Critical"` and `category="Security"` synchronously before the LLM even runs.

## Trade-offs & Limitations
- **RAG Embedding Model:** Using Google's embedding model for simplicity, but could be swapped for `sentence-transformers` for local privacy.
- **Synchronous PGVector:** The LangChain PGVector implementation is primarily synchronous, which required a workaround in an otherwise fully async FastAPI stack.
