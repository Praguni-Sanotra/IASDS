import json
import asyncio
from typing import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient

from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from config import MONGO_URI, REDIS_URL

router = APIRouter()

class LLMQuery(BaseModel):
    query: str
    userId: str
    sessionId: str

def get_timetable_context():
    """Fetches and formats the latest timetable as a text context."""
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    
    # Get latest published timetable
    timetable = db["timetables"].find_one({"status": "PUBLISHED"}, sort=[("createdAt", -1)])
    if not timetable:
        return "No published timetable available."

    # Fetch referenced data for readability
    faculties = {str(f['_id']): f['name'] for f in db["faculties"].find()}
    subjects = {str(s['_id']): f"{s['code']} ({s['name']})" for s in db["subjects"].find()}
    rooms = {str(r['_id']): r['roomNumber'] for r in db["rooms"].find()}
    
    context = f"MIET Academic Timetable (Semester {timetable.get('semester', 'N/A')}):\n"
    
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    for slot in timetable.get("slots", []):
        day = DAYS[slot['day']]
        p = slot['period'] + 1
        f = faculties.get(str(slot['facultyId']), "Unknown Faculty")
        s = subjects.get(str(slot['subjectId']), "Unknown Subject")
        r = rooms.get(str(slot['roomId']), "Unknown Room")
        b = slot.get('batchId', 'All Batches')
        
        context += f"- {day}, Period {p}: {s} taught by {f} in Room {r} for {b}\n"
        
    client.close()
    # Basic token limiting (approx 3000 tokens)
    return context[:12000] 

async def stream_tokens(query: str, context: str):
    llm = ChatOpenAI(
        model="gpt-4o", # Or gpt-3.5-turbo
        streaming=True,
        temperature=0
    )
    
    messages = [
        SystemMessage(content=f"You are an academic scheduling assistant for MIET college. Use the following timetable context to answer queries accurately. If the information is not present, say so. Do not hallucinate.\n\nCONTEXT:\n{context}"),
        HumanMessage(content=query)
    ]
    
    async for chunk in llm.astream(messages):
        content = chunk.content
        if content:
            yield f"data: {json.dumps({'token': content, 'done': False})}\n\n"
    
    yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

@router.post("/query")
async def query_llm(req: LLMQuery):
    context = get_timetable_context()
    return StreamingResponse(stream_tokens(req.query, context), media_type="text/event-stream")
