"""
Direct solver test - bypasses HTTP layer to test core logic
"""
import sys
sys.path.insert(0, '.')

from pymongo import MongoClient
from bson import ObjectId
from config import MONGO_URI
from services.csp_solver import solve

client = MongoClient(MONGO_URI)
db = client.get_database()

dept = 'CSE'
sem = 8

raw_subjects = list(db['subjects'].find({'isActive': True, 'department': dept, 'semester': sem}))
raw_rooms = list(db['rooms'].find({'isActive': True}))
raw_faculty = list(db['faculties'].find({'isActive': True}))

print(f"Subjects found: {len(raw_subjects)}")
for s in raw_subjects:
    fids = [str(f) for f in s.get('eligibleFaculty', [])]
    print(f"  [{s.get('code')}] {s.get('name')} | type={s.get('type')} | hours={s.get('hoursPerWeek')} | faculty={len(fids)}")

eligible_faculty_ids = set()
for s in raw_subjects:
    for fid in s.get('eligibleFaculty', []):
        eligible_faculty_ids.add(str(fid))

print(f"\nEligible faculty IDs: {len(eligible_faculty_ids)}")

# Build subjects
subjects = []
for s in raw_subjects:
    subjects.append({
        'id': str(s['_id']),
        'code': s.get('code', ''),
        'hoursPerWeek': s.get('hoursPerWeek', 3),
        'type': str(s.get('type', 'THEORY')).upper(),
        'eligibleFaculty': [str(fid) for fid in s.get('eligibleFaculty', [])],
        'semester': s.get('semester', sem),
        'department': s.get('department', dept)
    })

# Build faculties (only eligible ones)
faculties = []
for f in raw_faculty:
    fid = str(f['_id'])
    if fid not in eligible_faculty_ids:
        continue
    faculties.append({
        'id': fid,
        'name': f.get('name', ''),
        'maxHoursPerWeek': f.get('maxHoursPerWeek', 40),
        'availability': []
    })
print(f"Faculties prepared: {len(faculties)}")
for f in faculties:
    print(f"  {f['name']}")

# Build rooms - FIXED: normalize type and parse capacity as int
rooms = []
for r in raw_rooms:
    r_type = str(r.get('type') or 'LECTURE').upper().strip()
    if r_type in ('LECTURE', 'CLASSROOM', ''):
        r_type = 'THEORY'
    try:
        cap = int(r.get('capacity') or 60)
    except:
        cap = 60
    rooms.append({
        'id': str(r['_id']),
        'type': r_type,
        'capacity': cap
    })
print(f"\nRooms prepared: {len(rooms)}")
theory_rooms = [r for r in rooms if r['type'] == 'THEORY']
lab_rooms = [r for r in rooms if r['type'] == 'LAB']
print(f"  Theory rooms: {len(theory_rooms)}, Lab rooms: {len(lab_rooms)}")

# Build batch
batch_id = f"batch_{dept}_{sem}"
batches = [{
    'id': batch_id,
    'name': f"{dept} - Sem {sem}",
    'semester': sem,
    'section': 'A',
    'strength': 60
}]
print(f"\nBatches: {len(batches)}")

print("\n--- RUNNING SOLVER (timeout=30s) ---")
import time
t0 = time.time()
result = solve(
    faculties=faculties,
    subjects=subjects,
    rooms=rooms,
    batches=batches,
    constraints=[],
    timeout_seconds=30
)
elapsed = time.time() - t0

print(f"\n=== RESULT ===")
print(f"Status: {result['status']}")
print(f"Solving time: {result['solvingTimeMs']}ms (wall: {elapsed:.1f}s)")
print(f"Assignments: {len(result['assignments'])}")
print(f"Conflicts: {result['conflictCount']}")
if result['assignments']:
    for a in result['assignments'][:5]:
        print(f"  Day {a['day']} Period {a['period']}: subject={a['subjectId'][:8]} faculty={a['facultyId'][:8]}")

client.close()
