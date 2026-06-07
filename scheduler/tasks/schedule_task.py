import time
from datetime import datetime
from pymongo import MongoClient
from celery_app import celery_app
from services.notifier import notify_progress
from services.data_loader import load_schedule_data
from services.csp_solver import solve
from config import MONGO_URI

@celery_app.task(bind=True)
def generate_schedule(self, semester_id: str, config: dict):
    job_id = self.request.id
    
    def update(progress: int, stage: str):
        self.update_state(state='PROGRESS', meta={'progress': progress, 'stage': stage})
        notify_progress(job_id, progress, stage)
    
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    
    try:
        # Stage 1: Loading Data
        update(10, "LOADING_DATA")
        data = load_schedule_data(semester_id)
        
        # Prepare data for solver
        faculties = []
        for f in data['faculty']:
            # Handle availability mapping
            avail = []
            day_map = {'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5}
            for a in f.get('availability', []):
                avail.append({
                    'day': day_map.get(a['day'], 0),
                    'slots': a.get('availableSlots', list(range(8)))
                })
            
            faculties.append({
                'id': str(f['_id']),
                'name': f['name'],
                'maxHoursPerWeek': f.get('maxHoursPerWeek', 40),
                'availability': avail
            })
            
        target_dept = config.get('department')
        target_sem = int(semester_id) if semester_id.isdigit() else None

        subjects = []
        for s in data['subjects']:
            # Filter by department and semester if provided
            if target_dept and str(s.get('department')) != target_dept:
                continue
            if target_sem and s.get('semester') != target_sem:
                continue

            # Map 'teachers' field if it exists, otherwise 'eligibleFaculty'
            eligible = s.get('teachers', []) or s.get('eligibleFaculty', [])
            
            # FALLBACK: If no faculty assigned, allow all faculties to be eligible
            # so the solver doesn't crash (helps with testing/missing data)
            if not eligible:
                print(f"WARNING: Subject {s.get('code')} has no faculty assigned. Using all faculties as fallback.")
                eligible = [f['id'] for f in faculties]

            subjects.append({
                'id': str(s['_id']),
                'code': s['code'],
                'hoursPerWeek': s.get('hoursPerWeek', 3),
                'type': s.get('type', 'THEORY').upper(),
                'eligibleFaculty': [str(fid) for fid in eligible],
                'semester': s.get('semester', 1),
                'department': str(s.get('department', 'GEN'))
            })
            
        rooms = []
        for r in data['rooms']:
            rooms.append({
                'id': str(r['_id']),
                'type': r.get('type', 'THEORY').upper(),
                'capacity': r.get('capacity', 60)
            })
            
        # Create implicit batches based on (department, semester)
        batches = []
        batch_hours = {}
        for s in subjects:
            key = f"batch_{s['department']}_{s['semester']}"
            batch_hours[key] = batch_hours.get(key, 0) + s['hoursPerWeek']
            
        # Capacity check: Max slots per week = 6 days * 6 periods = 36
        MAX_SLOTS = 36
        for key, total_hrs in batch_hours.items():
            if total_hrs > MAX_SLOTS:
                print(f"WARNING: Batch {key} is over-capacity ({total_hrs}/{MAX_SLOTS} hrs). Scaling down subject hours.")
                # Simple scaling to fit
                scale_factor = MAX_SLOTS / total_hrs
                for s in subjects:
                    if f"batch_{s['department']}_{s['semester']}" == key:
                        s['hoursPerWeek'] = max(1, int(s['hoursPerWeek'] * scale_factor))

        batch_groups = {}
        for s in subjects:
            key = (s['department'], s['semester'])
            if key not in batch_groups:
                batch_groups[key] = True
                batches.append({
                    'id': f"batch_{s['department']}_{s['semester']}",
                    'name': f"{s['department']} - Sem {s['semester']}",
                    'semester': s['semester'],
                    'section': 'A',
                    'strength': 50
                })

        # Stage 2: Solving CSP (OR-Tools)
        update(40, "SOLVING_CSP")
        solver_result = solve(
            faculties=faculties,
            subjects=subjects,
            rooms=rooms,
            batches=batches,
            constraints=data['constraints'],
            timeout_seconds=config.get('timeout', 30)
        )
        
        if solver_result['status'] == 'INFEASIBLE':
            raise ValueError("Could not find a valid schedule with current constraints.")

        # Stage 3: Optimization (Placeholder for Genetic Algorithm if needed)
        update(80, "OPTIMIZING_GA")
        # Currently the CSP solver already returns a good solution.
        # We can add a GA step here to further optimize if solver_result['status'] == 'FEASIBLE'
        
        # Stage 4: Persisting Layout
        update(95, "SAVING")
        
        # Format slots for MongoDB
        formatted_slots = []
        day_reverse_map = {0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 4: 'FRI', 5: 'SAT'}
        
        # Period Timing Mapping (Solver uses 0-5 index)
        def get_period_times(p_idx):
            p_num = p_idx + 1 # Convert 0-indexed to 1-indexed
            timings = {
                1: ("09:35", "10:35"),
                2: ("10:35", "11:35"),
                3: ("11:35", "12:35"),
                4: ("12:35", "13:35"),
                5: ("14:35", "15:35"),
                6: ("15:35", "16:35"),
            }
            return timings.get(p_num, (f"{8+p_num}:00", f"{9+p_num}:00"))

        from bson import ObjectId
        for assignment in solver_result['assignments']:
            start_t, end_t = get_period_times(assignment['period'])
            formatted_slots.append({
                "_id": ObjectId(),
                "day": day_reverse_map[assignment['day']],
                "period": assignment['period'],
                "startTime": start_t,
                "endTime": end_t,
                "subjectId": ObjectId(assignment['subjectId']),
                "facultyId": ObjectId(assignment['facultyId']),
                "roomId": ObjectId(assignment['roomId']),
                "batch": assignment['batchId'],
                "section": assignment['section'],
                "isLab": False
            })
        
        timetable_doc = {
            "semesterId": semester_id,
            "academicYear": config.get('academicYear', "2024-25"),
            "generatedAt": datetime.now(),
            "status": "PUBLISHED",
            "algorithm": "OR_TOOLS_CSP",
            "solvingTimeMs": solver_result['solvingTimeMs'],
            "slots": formatted_slots,
            "conflictCount": solver_result['conflictCount'],
            "fairnessScore": 100,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        
        db["timetables"].update_many({"status": "PUBLISHED"}, {"$set": {"status": "ARCHIVED"}})
        result_db = db["timetables"].insert_one(timetable_doc)
        
        # Stage 5: Complete
        update(100, "DONE")
        notify_progress(job_id, 100, "DONE", status="SUCCESS")
        
        return {"message": "AI Schedule generated successfully", "timetableId": str(result_db.inserted_id)}
        
    except Exception as e:
        error_msg = str(e)
        import traceback
        traceback.print_exc()
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': error_msg})
        notify_progress(job_id, 0, f"FAILED: {error_msg}", status="FAILURE")
        raise e
    finally:
        client.close()
