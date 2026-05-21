import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from models.database import Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://senai:senai_password@localhost:5432/senai_crm")

engine = create_async_engine(DATABASE_URL, echo=False)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # Create pgvector extension if it doesn't exist
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        # Add vector column
        await conn.execute(text("ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);"))
