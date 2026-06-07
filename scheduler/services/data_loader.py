from pymongo import MongoClient
from config import MONGO_URI

def load_schedule_data(semester_id: str):
    """
    Connects to MongoDB and fetches all required scheduling data.
    """
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    
    # Data extraction for the solver (legacy async path — prefer generate_sync)
    faculty = list(db["faculties"].find({"isActive": True}))
    if db["teachers"].count_documents({}) > 0:
        from services.faculty_loader import load_faculty_for_department
        dept = str(semester_id) if semester_id else "CSE"
        faculty_solver, _ = load_faculty_for_department(db, dept)
        if faculty_solver:
            faculty = faculty_solver
    subjects = list(db["subjects"].find({"isActive": True}))
    rooms = list(db["rooms"].find({"isActive": True}))
    constraints = list(db["constraints"].find({"isEnabled": True}))
    
    client.close()
    
    return {
        "faculty": faculty,
        "subjects": subjects,
        "rooms": rooms,
        "constraints": constraints
    }
