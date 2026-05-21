import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores.pgvector import PGVector
from core.db import DATABASE_URL

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

def get_vector_store():
    # Replace +asyncpg with psycopg2 for LangChain's sync PGVector implementation
    sync_db_url = DATABASE_URL.replace("+asyncpg", "")
    return PGVector(
        connection_string=sync_db_url,
        embedding_function=embeddings,
        collection_name="senai_knowledge",
        use_jsonb=True,
    )

async def setup_rag():
    kb_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")
    loader = DirectoryLoader(kb_dir, glob="**/*.md", loader_cls=TextLoader)
    docs = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    splits = text_splitter.split_documents(docs)
    
    store = get_vector_store()
    store.add_documents(splits)
    print(f"RAG Setup Complete: {len(splits)} chunks embedded.")

def search_knowledge_base(query: str, k: int = 3):
    store = get_vector_store()
    results = store.similarity_search_with_score(query, k=k)
    return results
