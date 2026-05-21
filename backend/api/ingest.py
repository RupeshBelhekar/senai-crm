from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, Dict, Any
from core.db import get_db
from models.database import Email, Thread, Contact
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class EmailPayload(BaseModel):
    message_id: str
    sender: str
    subject: str
    body: str
    timestamp: datetime
    thread_id: str

@router.post("/ingest")
async def ingest_email(payload: EmailPayload, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Ingests an email, deduplicates, assigns priority, and links to thread.
    """
    # 1. Deduplication check
    stmt = select(Email).where(Email.message_id == payload.message_id)
    result = await db.execute(stmt)
    existing_email = result.scalars().first()
    
    if existing_email:
        return {"status": "ignored", "reason": "duplicate", "job_id": None}
        
    # 2. Thread linking / creation
    stmt = select(Thread).where(Thread.thread_id == payload.thread_id)
    result = await db.execute(stmt)
    thread = result.scalars().first()
    
    if not thread:
        thread = Thread(
            thread_id=payload.thread_id,
            subject=payload.subject,
            sender_email=payload.sender
        )
        db.add(thread)
        await db.commit()
        await db.refresh(thread)
    
    # 3. Contact tracking
    stmt = select(Contact).where(Contact.email == payload.sender)
    result = await db.execute(stmt)
    contact = result.scalars().first()
    
    if not contact:
        contact = Contact(email=payload.sender)
        db.add(contact)
        await db.commit()
    
    # 4. Layer 1 Heuristics (Synchronous pre-filter)
    body_lower = payload.body.lower()
    subject_lower = payload.subject.lower()
    full_text = subject_lower + " " + body_lower
    
    urgency_flag = None
    if any(word in full_text for word in ['urgent', 'p0', 'legal', 'cease and desist', 'ransomware']):
        urgency_flag = "Critical"
    
    category_flag = None
    if any(word in full_text for word in ['ransomware', 'btc', 'hacker', 'unauthorized', 'dark web']):
        category_flag = "Security"
        urgency_flag = "Critical"
    elif "@internal.com" in payload.sender.lower():
        category_flag = "Internal"
        
    # 5. Save email
    new_email = Email(
        thread_id=thread.id,
        message_id=payload.message_id,
        sender=payload.sender,
        subject=payload.subject,
        body=payload.body[:10000], # Truncate long bodies
        timestamp=payload.timestamp.replace(tzinfo=None),
        urgency=urgency_flag,
        category=category_flag,
        status="Processing"
    )
    db.add(new_email)
    await db.commit()
    await db.refresh(new_email)
    
    # 6. Trigger Agent / Background processing
    # In a real system, send this to Celery/Redis queue.
    # We will simulate this with FastAPI BackgroundTasks for simplicity in local demo.
    from services.agent import process_email_task
    background_tasks.add_task(process_email_task, new_email.id)
    
    return {"status": "accepted", "job_id": new_email.id, "thread_id": thread.thread_id}
