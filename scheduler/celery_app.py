from celery import Celery
from config import REDIS_URL

celery_app = Celery(
    "scheduler_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks.schedule_task']
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=3600,
    timezone="UTC",
    enable_utc=True,
)
