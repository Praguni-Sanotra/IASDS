import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017/hybridtimetable"
REDIS_URL = os.getenv("REDIS_URL") or "redis://127.0.0.1:6379/0"
NODE_BACKEND_URL = "http://127.0.0.1:5001/api"
