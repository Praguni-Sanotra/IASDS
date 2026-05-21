import json
import asyncio
import os
from typing import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo import MongoClient
from groq import Groq
from config import MONGO_URI

router = APIRouter()

class LLMQuery(BaseModel):
    query: str
    userId: str
    sessionId: str

def get_timetable_context():
    """Fetches and formats the latest timetable as a text context."""
    try:
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
            f = faculties.get(str(slot.get('facultyId')), "Unknown Faculty")
            s = subjects.get(str(slot.get('subjectId')), "Unknown Subject")
            r = rooms.get(str(slot.get('roomId')), "Unknown Room")
            b = slot.get('batchId', 'All Batches')
            
            context += f"- {day}, Period {p}: {s} taught by {f} in Room {r} for {b}\n"
            
        client.close()
        return context[:15000]
    except Exception as e:
        return f"Error fetching context: {str(e)}"

async def stream_tokens(query: str, context: str):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'token': 'Error: GROQ_API_KEY not found.', 'done': True})}\n\n"
        return

    client = Groq(api_key=api_key)
    
    try:
        # Using the native Groq client for streaming
        stream = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": f"You are an academic scheduling assistant for MIET college. Use the following timetable context to answer queries accurately. If the information is not present, say so. Do not hallucinate.\n\nCONTEXT:\n{context}"
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            model="llama-3.1-70b-versatile",
            temperature=0.1,
            stream=True,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'token': chunk.choices[0].delta.content, 'done': False})}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'token': f'Error: {str(e)}', 'done': True})}\n\n"
        return
    
    yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

@router.post("/query")
async def query_llm(req: LLMQuery):
    context = get_timetable_context()
    return StreamingResponse(stream_tokens(req.query, context), media_type="text/event-stream")
