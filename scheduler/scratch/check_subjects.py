from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017/hybridtimetable"

client = MongoClient(MONGO_URI)
db = client.get_database()
subjects = list(db["subjects"].find().limit(5))
for s in subjects:
    print(s)
client.close()
