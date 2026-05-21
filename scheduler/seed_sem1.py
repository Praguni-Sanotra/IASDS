from pymongo import MongoClient

client = MongoClient('mongodb+srv://Table:table123@cluster0.w030zx1.mongodb.net/hybridtimetable?retryWrites=true&w=majority')
db = client.get_database()

# Get some eligible faculties for the new subjects
all_faculties = list(db.faculties.find({'isActive': True}).limit(3))
fac_ids = [f['_id'] for f in all_faculties]

# Create some mock subjects for CSE Sem 1
sem1_subjects = [
    {
        'code': 'MAT-101',
        'name': 'Engineering Mathematics I',
        'type': 'THEORY',
        'department': 'CSE',
        'semester': 1,
        'hoursPerWeek': 4,
        'credits': 4,
        'eligibleFaculty': fac_ids,
        'isActive': True
    },
    {
        'code': 'PHY-101',
        'name': 'Engineering Physics',
        'type': 'THEORY',
        'department': 'CSE',
        'semester': 1,
        'hoursPerWeek': 3,
        'credits': 3,
        'eligibleFaculty': fac_ids,
        'isActive': True
    },
    {
        'code': 'CSE-101',
        'name': 'Introduction to Computer Science',
        'type': 'THEORY',
        'department': 'CSE',
        'semester': 1,
        'hoursPerWeek': 3,
        'credits': 3,
        'eligibleFaculty': fac_ids,
        'isActive': True
    },
    {
        'code': 'CSE-101L',
        'name': 'Computer Science Lab',
        'type': 'LAB',
        'department': 'CSE',
        'semester': 1,
        'hoursPerWeek': 2,
        'credits': 1,
        'eligibleFaculty': fac_ids,
        'isActive': True
    }
]

# Insert them
db.subjects.insert_many(sem1_subjects)
print(f"Successfully added {len(sem1_subjects)} subjects for CSE Sem 1!")
