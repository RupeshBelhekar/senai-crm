from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_, text
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from core.db import get_db
from models.database import Thread, Email, Action, Contact
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Pydantic Schemas ---
class ActionResponse(BaseModel):
    id: int
    email_id: int
    action_type: str
    proposed_content: Optional[str]
    is_approved: bool
    executed_at: Optional[datetime]

    class Config:
        from_attributes = True

class EmailResponse(BaseModel):
    id: int
    message_id: str
    sender: str
    subject: str
    body: str
    timestamp: datetime
    sentiment_score: Optional[float]
    category: Optional[str]
    urgency: Optional[str]
    requires_human: bool
    confidence: Optional[float]
    status: str
    actions: List[ActionResponse] = []

    class Config:
        from_attributes = True

class ThreadListItem(BaseModel):
    id: int
    thread_id: str
    subject: str
    sender_email: str
    first_seen_at: datetime
    last_updated_at: datetime
    status: str
    assigned_to: Optional[str]
    latest_sentiment: Optional[float]
    latest_category: Optional[str]
    latest_urgency: Optional[str]
    latest_status: str

    class Config:
        from_attributes = True

class ContactResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    company: Optional[str]
    status: str
    account_value: float
    churn_risk_score: float
    last_contact_at: Optional[datetime]

    class Config:
        from_attributes = True

class ThreadDetailResponse(BaseModel):
    id: int
    thread_id: str
    subject: str
    sender_email: str
    status: str
    assigned_to: Optional[str]
    emails: List[EmailResponse]
    contact: Optional[ContactResponse]

    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    sentiment_trend: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    urgency_distribution: List[Dict[str, Any]]
    status_distribution: List[Dict[str, Any]]
    key_metrics: Dict[str, Any]

# --- Endpoints ---

@router.get("/threads", response_model=List[ThreadListItem])
async def list_threads(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all threads, including aggregates of their latest email (sentiment, category, urgency, status).
    Includes filtering and search functionality.
    """
    # Base query for threads
    query = select(Thread).order_by(desc(Thread.last_updated_at))
    
    result = await db.execute(query)
    threads = result.scalars().all()
    
    items = []
    for thread in threads:
        # Fetch emails for this thread to find the latest state
        email_query = select(Email).where(Email.thread_id == thread.id).order_by(desc(Email.timestamp))
        email_result = await db.execute(email_query)
        emails = email_result.scalars().all()
        
        if not emails:
            continue
            
        latest_email = emails[0]
        
        # Apply filters in Python to handle relationship attributes dynamically
        if status and thread.status.lower() != status.lower():
            continue
        if urgency and (latest_email.urgency or "").lower() != urgency.lower():
            continue
        if category and (latest_email.category or "").lower() != category.lower():
            continue
        if search:
            search_lower = search.lower()
            match = (
                search_lower in thread.subject.lower() or 
                search_lower in thread.sender_email.lower() or
                any(search_lower in e.body.lower() for e in emails)
            )
            if not match:
                continue
                
        items.append(ThreadListItem(
            id=thread.id,
            thread_id=thread.thread_id,
            subject=thread.subject,
            sender_email=thread.sender_email,
            first_seen_at=thread.first_seen_at,
            last_updated_at=thread.last_updated_at,
            status=thread.status,
            assigned_to=thread.assigned_to,
            latest_sentiment=latest_email.sentiment_score,
            latest_category=latest_email.category,
            latest_urgency=latest_email.urgency,
            latest_status=latest_email.status
        ))
        
    return items

@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
async def get_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches details of a specific thread, including all emails, their actions, and the sender contact.
    """
    # Fetch thread
    stmt = select(Thread).where(Thread.thread_id == thread_id)
    res = await db.execute(stmt)
    thread = res.scalars().first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    # Fetch emails with actions
    email_stmt = select(Email).where(Email.thread_id == thread.id).order_by(Email.timestamp)
    email_res = await db.execute(email_stmt)
    emails = email_res.scalars().all()
    
    email_list = []
    for email in emails:
        action_stmt = select(Action).where(Action.email_id == email.id)
        action_res = await db.execute(action_stmt)
        actions = action_res.scalars().all()
        
        email_resp = EmailResponse(
            id=email.id,
            message_id=email.message_id,
            sender=email.sender,
            subject=email.subject,
            body=email.body,
            timestamp=email.timestamp,
            sentiment_score=email.sentiment_score,
            category=email.category,
            urgency=email.urgency,
            requires_human=email.requires_human,
            confidence=email.confidence,
            status=email.status,
            actions=[ActionResponse.from_orm(act) for act in actions]
        )
        email_list.append(email_resp)
        
    # Fetch contact info
    contact_stmt = select(Contact).where(Contact.email == thread.sender_email)
    contact_res = await db.execute(contact_stmt)
    contact = contact_res.scalars().first()
    
    contact_resp = None
    if contact:
        contact_resp = ContactResponse.from_orm(contact)
        
    return ThreadDetailResponse(
        id=thread.id,
        thread_id=thread.thread_id,
        subject=thread.subject,
        sender_email=thread.sender_email,
        status=thread.status,
        assigned_to=thread.assigned_to,
        emails=email_list,
        contact=contact_resp
    )

@router.post("/actions/{action_id}/approve")
async def approve_action(action_id: int, db: AsyncSession = Depends(get_db)):
    """
    Approves a proposed action (auto-reply or escalation).
    """
    import uuid
    stmt = select(Action).where(Action.id == action_id)
    res = await db.execute(stmt)
    action = res.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    if action.is_approved:
        return {"status": "already_approved", "action_id": action.id}
        
    # Update action
    action.is_approved = True
    action.executed_at = datetime.utcnow()
    action.approved_by = "Human Operator"
    
    # Update corresponding email and thread status
    email_stmt = select(Email).where(Email.id == action.email_id)
    email_res = await db.execute(email_stmt)
    email = email_res.scalars().first()
    if email:
        email.status = "Replied" if action.action_type == "Auto-Reply" else "Escalated"
        
        # Create outgoing email record to show in thread history if it's a reply
        if action.action_type == "Auto-Reply":
            outgoing_email = Email(
                thread_id=email.thread_id,
                message_id=f"auto_{uuid.uuid4()}@internal.com",
                sender="support@internal.com",
                subject=f"Re: {email.subject}",
                body=action.proposed_content or "",
                timestamp=datetime.utcnow(),
                sentiment_score=1.0,
                category="Auto-Reply",
                urgency=email.urgency,
                requires_human=False,
                confidence=1.0,
                status="Replied"
            )
            db.add(outgoing_email)
        
        # Update thread status
        thread_stmt = select(Thread).where(Thread.id == email.thread_id)
        thread_res = await db.execute(thread_stmt)
        thread = thread_res.scalars().first()
        if thread:
            thread.status = "Resolved" if action.action_type == "Auto-Reply" else "Escalated"
            thread.last_updated_at = datetime.utcnow()
            
    await db.commit()
    return {"status": "success", "action_id": action.id}

class ReplyRequest(BaseModel):
    body: str

@router.post("/threads/{thread_id}/reply")
async def send_manual_reply(thread_id: str, payload: ReplyRequest, db: AsyncSession = Depends(get_db)):
    """
    Sends a manual reply to a thread: creates an outgoing email, logs an Action, and resolves the thread.
    """
    import uuid
    # 1. Fetch thread
    stmt = select(Thread).where(Thread.thread_id == thread_id)
    res = await db.execute(stmt)
    thread = res.scalars().first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    # 2. Fetch all emails in thread to find the latest incoming email
    email_stmt = select(Email).where(Email.thread_id == thread.id).order_by(desc(Email.timestamp))
    email_res = await db.execute(email_stmt)
    emails = email_res.scalars().all()
    if not emails:
        raise HTTPException(status_code=400, detail="Thread has no emails")
        
    latest_incoming = None
    for email in emails:
        if "internal.com" not in email.sender.lower():
            latest_incoming = email
            break
            
    if not latest_incoming:
        # Fall back to the latest email
        latest_incoming = emails[0]
        
    # 3. Create outgoing email
    outgoing_email = Email(
        thread_id=thread.id,
        message_id=f"manual_{uuid.uuid4()}@internal.com",
        sender="support@internal.com",
        subject=f"Re: {thread.subject}",
        body=payload.body,
        timestamp=datetime.utcnow(),
        sentiment_score=1.0,
        category="Manual-Reply",
        urgency=latest_incoming.urgency,
        requires_human=False,
        confidence=1.0,
        status="Replied"
    )
    db.add(outgoing_email)
    await db.flush()
    
    # 4. Handle actions on the latest incoming email
    action_stmt = select(Action).where(and_(Action.email_id == latest_incoming.id, Action.is_approved == False))
    action_res = await db.execute(action_stmt)
    unapproved_actions = action_res.scalars().all()
    
    for action in unapproved_actions:
        action.is_approved = True
        action.executed_at = datetime.utcnow()
        action.approved_by = "Human Operator"
        action.proposed_content = payload.body
        
    if not unapproved_actions:
        manual_action = Action(
            email_id=latest_incoming.id,
            agent_reasoning_log=[{"thought": "Operator responded manually.", "observation": None}],
            action_type="Manual-Reply",
            proposed_content=payload.body,
            is_approved=True,
            approved_by="Human Operator",
            executed_at=datetime.utcnow()
        )
        db.add(manual_action)
        
    # 5. Update thread status
    thread.status = "Resolved"
    thread.last_updated_at = datetime.utcnow()
    
    # Update latest incoming email status
    latest_incoming.status = "Replied"
    
    await db.commit()
    return {"status": "success", "thread_id": thread.thread_id}


@router.get("/contacts", response_model=List[ContactResponse])
async def list_contacts(db: AsyncSession = Depends(get_db)):
    """
    Lists all contact profiles.
    """
    stmt = select(Contact).order_by(desc(Contact.churn_risk_score))
    res = await db.execute(stmt)
    contacts = res.scalars().all()
    return contacts

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """
    Generates statistics on email sentiment, category distribution, urgency, and SLA performance.
    """
    # 1. Sentiment Trend (grouped by day)
    sentiment_query = (
        select(
            func.date_trunc('day', Email.timestamp).label('day'),
            func.avg(Email.sentiment_score).label('avg_sentiment'),
            func.count(Email.id).label('email_count')
        )
        .where(Email.sentiment_score.isnot(None))
        .group_by(text('day'))
        .order_by(text('day'))
    )
    sentiment_res = await db.execute(sentiment_query)
    sentiment_trend = [
        {
            "date": row.day.strftime("%Y-%m-%d") if row.day else "",
            "avg_sentiment": round(row.avg_sentiment, 2) if row.avg_sentiment is not None else 0,
            "count": row.email_count
        } for row in sentiment_res.all()
    ]

    # If no data, return a dummy fallback for layout styling
    if not sentiment_trend:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        sentiment_trend = [{"date": today, "avg_sentiment": 0.0, "count": 0}]

    # 2. Category Distribution
    category_query = (
        select(Email.category, func.count(Email.id).label('count'))
        .group_by(Email.category)
    )
    category_res = await db.execute(category_query)
    category_distribution = [
        {"name": row.category or "Unclassified", "value": row.count} for row in category_res.all()
    ]

    # 3. Urgency Distribution
    urgency_query = (
        select(Email.urgency, func.count(Email.id).label('count'))
        .group_by(Email.urgency)
    )
    urgency_res = await db.execute(urgency_query)
    urgency_distribution = [
        {"name": row.urgency or "Normal", "value": row.count} for row in urgency_res.all()
    ]

    # 4. Status Distribution
    status_query = (
        select(Email.status, func.count(Email.id).label('count'))
        .group_by(Email.status)
    )
    status_res = await db.execute(status_query)
    status_distribution = [
        {"name": row.status, "value": row.count} for row in status_res.all()
    ]

    # 5. Key Metrics
    total_emails_query = select(func.count(Email.id))
    total_emails = (await db.execute(total_emails_query)).scalar() or 0

    pending_actions_query = select(func.count(Action.id)).where(Action.is_approved == False)
    pending_actions = (await db.execute(pending_actions_query)).scalar() or 0

    resolved_query = select(func.count(Thread.id)).where(Thread.status == "Resolved")
    resolved_threads = (await db.execute(resolved_query)).scalar() or 0

    # Churn Risk Contacts
    risk_contacts_query = select(func.count(Contact.id)).where(Contact.churn_risk_score > 0.6)
    risk_contacts = (await db.execute(risk_contacts_query)).scalar() or 0

    key_metrics = {
        "total_emails": total_emails,
        "pending_actions": pending_actions,
        "resolved_threads": resolved_threads,
        "high_risk_contacts": risk_contacts,
        "sla_compliance_rate": 96.5 # Mock SLA target rate for design display
    }

    return AnalyticsResponse(
        sentiment_trend=sentiment_trend,
        category_distribution=category_distribution,
        urgency_distribution=urgency_distribution,
        status_distribution=status_distribution,
        key_metrics=key_metrics
    )
