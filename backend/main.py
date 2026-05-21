from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import ingest, dashboard
from core.db import init_db
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SenAI CRM Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()
    # Initialize RAG vector store if needed
    from services.rag import setup_rag
    await setup_rag()

app.include_router(ingest.router, prefix="/api", tags=["Ingest"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

