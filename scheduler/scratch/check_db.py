from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017/hybridtimetable"

client = MongoClient(MONGO_URI)
db = client.get_database()
print(f"Collections: {db.list_collection_names()}")
client.close()
