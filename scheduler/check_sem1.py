from pymongo import MongoClient
import sys

client = MongoClient('mongodb+srv://Table:table123@cluster0.w030zx1.mongodb.net/hybridtimetable?retryWrites=true&w=majority')
db = client.get_database()

dept = 'CSE'
sem = 1

subjects = list(db.subjects.find({'department': dept, 'semester': sem, 'isActive': True}))
print(f'Total subjects for {dept} Sem {sem}: {len(subjects)}')

for s in subjects:
    fac_ids = s.get('eligibleFaculty', [])
    print(f"- {s.get('code')}: {s.get('name')} ({s.get('type')}) - {s.get('hoursPerWeek')} hrs, Eligible Faculty: {len(fac_ids)}")

print('\nChecking batches...')
# Check if batch splitting or dummy batch creation logic in generate_sync works for Sem 1
