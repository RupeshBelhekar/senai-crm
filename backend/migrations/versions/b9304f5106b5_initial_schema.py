"""Initial schema

Revision ID: b9304f5106b5
Revises: 
Create Date: 2026-05-21 22:47:18.507605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b9304f5106b5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # 2. Create contacts table
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('company', sa.String(), nullable=True),
        sa.Column('status', sa.Column('status', sa.String(), server_default='Active'), nullable=True),
        sa.Column('account_value', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('churn_risk_score', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_contact_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contacts_id'), 'contacts', ['id'], unique=False)
    op.create_index(op.f('ix_contacts_email'), 'contacts', ['email'], unique=True)

    # 3. Create threads table
    op.create_table(
        'threads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(), nullable=True),
        sa.Column('subject', sa.String(), nullable=True),
        sa.Column('sender_email', sa.String(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_updated_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), server_default='Open', nullable=True),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_threads_id'), 'threads', ['id'], unique=False)
    op.create_index(op.f('ix_threads_thread_id'), 'threads', ['thread_id'], unique=True)
    op.create_index(op.f('ix_threads_sender_email'), 'threads', ['sender_email'], unique=False)

    # 4. Create emails table
    op.create_table(
        'emails',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.Integer(), nullable=True),
        sa.Column('message_id', sa.String(), nullable=True),
        sa.Column('sender', sa.String(), nullable=True),
        sa.Column('subject', sa.String(), nullable=True),
        sa.Column('body', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('urgency', sa.String(), nullable=True),
        sa.Column('requires_human', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('raw_entities', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), server_default='Received', nullable=True),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_emails_id'), 'emails', ['id'], unique=False)
    op.create_index(op.f('ix_emails_message_id'), 'emails', ['message_id'], unique=True)

    # 5. Create actions table
    op.create_table(
        'actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email_id', sa.Integer(), nullable=True),
        sa.Column('agent_reasoning_log', sa.JSON(), nullable=True),
        sa.Column('action_type', sa.String(), nullable=True),
        sa.Column('proposed_content', sa.String(), nullable=True),
        sa.Column('is_approved', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('approved_by', sa.String(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['email_id'], ['emails.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_actions_id'), 'actions', ['id'], unique=False)

    # 6. Create knowledge_chunks table
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_doc', sa.String(), nullable=True),
        sa.Column('chunk_text', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_id'), 'knowledge_chunks', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_source_doc'), 'knowledge_chunks', ['source_doc'], unique=False)
    
    # Add pgvector column via raw SQL execution
    op.execute("ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(768)")

    # 7. Create web_intelligence_cache table
    op.create_table(
        'web_intelligence_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_url', sa.String(), nullable=True),
        sa.Column('target_entity', sa.String(), nullable=True),
        sa.Column('scraped_data', sa.JSON(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_web_intelligence_cache_id'), 'web_intelligence_cache', ['id'], unique=False)
    op.create_index(op.f('ix_web_intelligence_cache_target_entity'), 'web_intelligence_cache', ['target_entity'], unique=False)

    # 8. Create audit_log table
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(), nullable=True),
        sa.Column('performed_by', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('diff', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_id'), 'audit_log', ['id'], unique=False)
    op.create_index(op.f('ix_audit_log_entity_type'), 'audit_log', ['entity_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('audit_log')
    op.drop_table('web_intelligence_cache')
    op.drop_table('knowledge_chunks')
    op.drop_table('actions')
    op.drop_table('emails')
    op.drop_table('threads')
    op.drop_table('contacts')

