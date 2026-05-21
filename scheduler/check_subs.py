from pymongo import MongoClient

client = MongoClient('mongodb+srv://Table:table123@cluster0.w030zx1.mongodb.net/hybridtimetable?retryWrites=true&w=majority')
db = client.get_database()
subjects = list(db.subjects.find({'department': 'CSE', 'semester': 8, 'isActive': True}))
print(f'Total subjects for CSE Sem 8: {len(subjects)}')
for s in subjects:
    print(f"- {s.get('code')}: {s.get('name')} ({s.get('type')}) - {s.get('hoursPerWeek')} hrs, credits: {s.get('credits')}")

print('\nNow checking CSE Sem 6:')
subjects6 = list(db.subjects.find({'department': 'CSE', 'semester': 6, 'isActive': True}))
print(f'Total subjects for CSE Sem 6: {len(subjects6)}')
for s in subjects6:
    print(f"- {s.get('code')}: {s.get('name')} ({s.get('type')}) - {s.get('hoursPerWeek')} hrs, credits: {s.get('credits')}")
