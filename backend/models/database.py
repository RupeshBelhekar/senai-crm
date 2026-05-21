from datetime import datetime
from typing import Optional, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(String, default="Active") # VIP|Blocked|Active|Churned
    account_value = Column(Float, default=0.0)
    churn_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_contact_at = Column(DateTime, nullable=True)

class Thread(Base):
    __tablename__ = "threads"
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, unique=True, index=True) # from JSON
    subject = Column(String)
    sender_email = Column(String, index=True)
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Open") # Open|Resolved|Escalated|Ignored
    assigned_to = Column(String, nullable=True)
    
    emails = relationship("Email", back_populates="thread", cascade="all, delete-orphan")

class Email(Base):
    __tablename__ = "emails"
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"))
    message_id = Column(String, unique=True, index=True)
    sender = Column(String)
    subject = Column(String)
    body = Column(String)
    timestamp = Column(DateTime)
    sentiment_score = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    urgency = Column(String, nullable=True)
    requires_human = Column(Boolean, default=False)
    confidence = Column(Float, nullable=True)
    raw_entities = Column(JSON, nullable=True)
    status = Column(String, default="Received") # Received|Processing|Replied|Escalated|Ignored
    
    thread = relationship("Thread", back_populates="emails")
    actions = relationship("Action", back_populates="email", cascade="all, delete-orphan")

class Action(Base):
    __tablename__ = "actions"
    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"))
    agent_reasoning_log = Column(JSON) # Array of Step traces
    action_type = Column(String) # Auto-Reply|Escalate|Legal-Flag|Ticket-Created|Ignored
    proposed_content = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(String, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    
    email = relationship("Email", back_populates="actions")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(Integer, primary_key=True, index=True)
    source_doc = Column(String, index=True)
    chunk_text = Column(String)
    # Note: the embedding column relies on pgvector.
    # From pgvector.sqlalchemy import Vector
    # embedding = Column(Vector(768)) # Example for Gemini/OpenAI
    # For compatibility we'll add it in the DB engine setup block or raw SQL.
    created_at = Column(DateTime, default=datetime.utcnow)

class WebIntelligenceCache(Base):
    __tablename__ = "web_intelligence_cache"
    id = Column(Integer, primary_key=True, index=True)
    source_url = Column(String)
    target_entity = Column(String, index=True)
    scraped_data = Column(JSON)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, index=True)
    entity_id = Column(Integer)
    action = Column(String)
    performed_by = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    diff = Column(JSON, nullable=True)
