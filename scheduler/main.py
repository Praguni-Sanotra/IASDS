from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import schedule, reschedule, llm
from routers.generate_sync import router as generate_sync_router

app = FastAPI(title="IASDS Scheduler Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Node.js backend acts as primary consumer
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Async generation (Celery-based, requires Redis)
app.include_router(schedule.router, tags=["Schedule"])
app.include_router(reschedule.router, tags=["Reschedule"])

# Synchronous generation (direct CSP, no Celery/Redis needed)
app.include_router(generate_sync_router, tags=["Generate Sync"])

app.include_router(llm.router, prefix="/llm", tags=["LLM"])


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "scheduler",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

