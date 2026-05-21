import os
from celery import Celery

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery("senai_crm", broker=redis_url, backend=redis_url)

# Define Celery configurations
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def example_background_task():
    return "Celery worker is running successfully!"
