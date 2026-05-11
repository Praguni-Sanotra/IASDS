from fastapi import APIRouter
from pydantic import BaseModel
from celery.result import AsyncResult
from tasks.schedule_task import generate_schedule
from celery_app import celery_app

router = APIRouter()

class GenerateRequest(BaseModel):
    semesterId: str
    academicYear: str
    config: dict = {}

@router.post("/generate")
def trigger_generation(req: GenerateRequest):
    task = generate_schedule.delay(req.semesterId, req.config)
    return {"jobId": task.id, "status": "queued"}

@router.get("/status/{job_id}")
def get_status(job_id: str):
    task_result = AsyncResult(job_id, app=celery_app)
    
    response = {
        "jobId": job_id,
        "status": task_result.status,
        "progress": 0,
        "stage": "PENDING"
    }
    
    if task_result.state == 'PROGRESS':
        meta = task_result.info or {}
        response["progress"] = meta.get('progress', 0)
        response["stage"] = meta.get('stage', '')
    elif task_result.state == 'SUCCESS':
        response["progress"] = 100
        response["stage"] = "DONE"
        response["result"] = task_result.result
    elif task_result.state == 'FAILURE':
        response["progress"] = 0
        response["stage"] = "FAILED"
        response["error"] = str(task_result.info)
        
    return response

@router.get("/latest")
def get_latest():
    return {"status": "ok", "message": "No recent schedules found"}
