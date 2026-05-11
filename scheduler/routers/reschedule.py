from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from services.reschedule_engine import reschedule

router = APIRouter()

class RescheduleRequest(BaseModel):
    timetableId: str
    triggerType: str  # "FACULTY_ABSENT" | "ROOM_UNAVAILABLE" | "MANUAL_MOVE"
    affectedEntityId: str
    affectedDay: int
    affectedPeriods: List[int]
    replacementEntityId: Optional[str] = None
    targetDay: Optional[int] = None
    targetPeriod: Optional[int] = None
    
    # Context data for the algorithm (passed from Node backend to avoid extra DB calls)
    allSlots: List[Dict[str, Any]]
    faculties: List[Dict[str, Any]]
    subjects: List[Dict[str, Any]]
    rooms: List[Dict[str, Any]]

@router.post("/reschedule")
def trigger_reschedule(req: RescheduleRequest):
    result = reschedule(req.model_dump())
    return result
