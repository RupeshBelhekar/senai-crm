from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.database import Email, Action, Thread
from core.db import async_session
from services.rag import search_knowledge_base
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from pydantic import BaseModel, Field
from typing import List, Optional
import json

llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2)

class ClassificationOutput(BaseModel):
    category: str
    sentiment: str
    sentiment_score: float
    urgency: str
    requires_human: bool
    escalation_reason: Optional[str]
    suggested_reply: Optional[str]
    confidence: float
    detected_entities: dict

async def process_email_task(email_id: int):
    async with async_session() as db:
        # Get Email and Thread History
        stmt = select(Email).where(Email.id == email_id)
        result = await db.execute(stmt)
        email = result.scalars().first()
        if not email:
            return
            
        stmt = select(Email).where(Email.thread_id == email.thread_id).order_by(Email.timestamp)
        result = await db.execute(stmt)
        thread_emails = result.scalars().all()
        
        thread_history = "\n".join([f"{e.timestamp} - {e.sender}: {e.subject}\n{e.body}" for e in thread_emails])
        
        # Retrieval
        rag_results = search_knowledge_base(email.body)
        rag_context = "\n".join([doc.page_content for doc, score in rag_results])
        
        # Classification Prompt
        prompt = PromptTemplate.from_template("""
        You are an AI support agent triaging incoming emails for SenAI.
        Read the following thread history and classify the LATEST email.
        
        Thread History:
        {thread_history}
        
        Knowledge Base Context:
        {rag_context}
        
        Classify the email according to these rules:
        - category: Complaint|Inquiry|Bug Report|Feature Request|Compliance|Legal|Billing|Spam|Internal|Other
        - sentiment_score: -1.0 to 1.0
        - requires_human: True if Legal, Compliance, or if you are not confident.
        
        Output valid JSON only matching the schema exactly.
        """)
        
        chain = prompt | llm
        
        # Real system would use `.with_structured_output(ClassificationOutput)`
        # Assuming simple structured output generation for demo.
        response = chain.invoke({
            "thread_history": thread_history,
            "rag_context": rag_context
        })
        
        try:
            # Simple JSON parse (in production use Langchain Output Parsers)
            output_str = response.content.strip()
            if output_str.startswith('```json'):
                output_str = output_str[7:-3]
            
            output = json.loads(output_str)
            
            email.category = output.get("category", email.category)
            email.sentiment_score = output.get("sentiment_score", email.sentiment_score)
            email.urgency = output.get("urgency", email.urgency)
            email.confidence = output.get("confidence", 0.0)
            email.requires_human = output.get("requires_human", True)
            email.raw_entities = output.get("detected_entities", {})
            
            # Action logging
            if email.requires_human:
                email.status = "Escalated"
                action_type = "Escalate"
            else:
                email.status = "Replied" # Simulated auto-reply
                action_type = "Auto-Reply"
                
            action = Action(
                email_id=email.id,
                agent_reasoning_log=[{"thought": "Classified email using LLM.", "observation": output}],
                action_type=action_type,
                proposed_content=output.get("suggested_reply")
            )
            db.add(action)
            await db.commit()
            
        except Exception as e:
            print(f"Failed to process email {email_id}: {e}")
            email.status = "Escalated"
            email.requires_human = True
            await db.commit()
