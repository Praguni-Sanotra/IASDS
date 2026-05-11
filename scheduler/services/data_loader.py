from pymongo import MongoClient
from config import MONGO_URI

def load_schedule_data(semester_id: str):
    """
    Connects to MongoDB and fetches all required scheduling data.
    """
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    
    # Data extraction for the solver
    faculty = list(db["faculties"].find({"isActive": True}))
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
