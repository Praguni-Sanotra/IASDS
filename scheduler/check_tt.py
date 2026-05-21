from pymongo import MongoClient

client = MongoClient('mongodb+srv://Table:table123@cluster0.w030zx1.mongodb.net/hybridtimetable?retryWrites=true&w=majority')
db = client.get_database()
tt = db.timetables.find_one({}, sort=[('_id', -1)])
print('Timetable ID:', tt['_id'])
for day in tt['days']:
    for s in day['slots']:
        print(f"Day {day['dayOfWeek']} Period {s['period']}: Sub={s['subject']} Fac={s['faculty']} Room={s.get('room')}")
