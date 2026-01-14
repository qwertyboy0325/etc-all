from celery import Celery
from app.core.config import settings

celery_app = Celery("worker", broker=settings.CELERY_BROKER_URL, include=["app.worker"])

celery_app.conf.update(
    result_backend=settings.CELERY_RESULT_BACKEND,
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
)

