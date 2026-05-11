import httpx
import os
from config import NODE_BACKEND_URL

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "super_secret_internal_key")

def notify_progress(job_id: str, progress: int, stage: str, status: str = "PROGRESS", **kwargs):
    """
    POSTs progress updates to the Node.js backend.
    """
    payload = {
        "jobId": job_id,
        "progress": progress,
        "stage": stage,
        "status": status,
        **kwargs
    }
    try:
        # Node backend URL for internal progress updates
        headers = {"x-internal-secret": INTERNAL_SECRET}
        httpx.post(f"{NODE_BACKEND_URL}/schedule/internal/progress", json=payload, headers=headers, timeout=5.0)
    except Exception as e:
        print(f"Failed to notify backend: {e}")
