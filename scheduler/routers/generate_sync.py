"""
Synchronous timetable generation router.
Runs the CSP solver directly in the request context (no Celery/Redis needed).
Used by the admin "Generate AI Timetable" button flow.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from pymongo import MongoClient
from bson import ObjectId
from config import MONGO_URI
from services.csp_solver import solve
from services.faculty_loader import (
    load_faculty_for_department,
    valid_faculty_id_set,
    filter_eligible_to_real_faculty,
)

router = APIRouter()


class SyncGenerateRequest(BaseModel):
    department: str
    semester: int
    academicYear: str
    timeout: Optional[int] = 90
    allowFallbacks: Optional[bool] = True


# Day index ↔ string mappings (matches existing schema)
DAY_MAP = {'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5}
DAY_REVERSE_MAP = {0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 4: 'FRI', 5: 'SAT'}

# Existing timing config (matches schedule_task.py)
PERIOD_TIMINGS = {
    1: ("09:35", "10:35"),
    2: ("10:35", "11:35"),
    3: ("11:35", "12:35"),
    4: ("12:35", "13:35"),
    5: ("14:35", "15:35"),   # lunch gap between 4 and 5
    6: ("15:35", "16:35"),
}


def get_period_times(p_idx: int):
    """Convert 0-indexed period to start/end time strings."""
    p_num = p_idx + 1
    return PERIOD_TIMINGS.get(p_num, (f"{8 + p_num}:00", f"{9 + p_num}:00"))


@router.post("/generate-sync")
def generate_timetable_sync(req: SyncGenerateRequest):
    """
    Synchronously generates a conflict-free timetable using the OR-Tools CSP solver.
    
    Flow:
      1. Load faculty, subjects, rooms from MongoDB filtered by dept+semester
      2. Build solver inputs
      3. Run CSP (with backtracking, hard constraints)
      4. Archive previous timetable for this dept/semester
      5. Persist new timetable as PUBLISHED
      6. Return timetable document
    """
    client = MongoClient(MONGO_URI)
    db = client.get_database()

    try:
        # ----------------------------------------------------------------
        # 1. LOAD DATA
        # ----------------------------------------------------------------
        # Load college teachers (preferred) or legacy faculties seed data
        dept_faculty_pool, faculty_source = load_faculty_for_department(db, req.department)
        valid_teacher_ids = valid_faculty_id_set(dept_faculty_pool)

        raw_subjects = list(db["subjects"].find({
            "isActive": True,
            "department": req.department,
            "semester": req.semester
        }))
        raw_rooms = list(db["rooms"].find({"isActive": True}))
        raw_constraints = list(db["constraints"].find({"isEnabled": True}))

        if not raw_subjects:
            raise HTTPException(
                status_code=422,
                detail=f"No active subjects found for Department '{req.department}' Semester {req.semester}. "
                       f"Please configure subjects first."
            )

        if not raw_rooms:
            raise HTTPException(
                status_code=422,
                detail="No active rooms found. Please add classrooms/labs before generating."
            )

        # ----------------------------------------------------------------
        # 2. PRE-VALIDATION DIAGNOSTIC ENGINE & AUTO-FIXES
        # ----------------------------------------------------------------
        diagnostics = []
        fixes_applied = []
        fatal_errors = False
        
        eligible_faculty_ids = set()

        if not dept_faculty_pool:
            diagnostics.append(
                f"No teachers found for department '{req.department}'. "
                f"Check the teachers collection and department mapping."
            )
            fatal_errors = True

        faculty_load_counter = {f['id']: 0 for f in dept_faculty_pool}

        if faculty_source == 'teachers':
            fixes_applied.append(
                f"Using {len(dept_faculty_pool)} college teachers from the teachers collection "
                f"(not seed faculties)."
            )

        # Validate subjects — drop stale seed faculty IDs, assign real teachers
        for idx, s in enumerate(raw_subjects):
            raw_eligible = [str(fid) for fid in s.get('eligibleFaculty', [])]
            eligible = filter_eligible_to_real_faculty(raw_eligible, valid_teacher_ids)
            s_code = s.get('code', 'Unknown')

            if raw_eligible and not eligible and faculty_source == 'teachers':
                fixes_applied.append(
                    f"Subject {s_code} had seed/invalid faculty mapping — will assign a real teacher."
                )

            if not eligible:
                if req.allowFallbacks and dept_faculty_pool:
                    chosen = min(
                        dept_faculty_pool,
                        key=lambda f: faculty_load_counter.get(f['id'], 0)
                    )
                    chosen_id = chosen['id']
                    eligible = [chosen_id]
                    faculty_load_counter[chosen_id] = (
                        faculty_load_counter.get(chosen_id, 0) + s.get('hoursPerWeek', 3)
                    )
                    fixes_applied.append(
                        f"Subject {s_code} auto-assigned to {chosen.get('name', chosen_id)}."
                    )
                    s['eligibleFaculty'] = [ObjectId(chosen_id)]
                    db["subjects"].update_one(
                        {'_id': s['_id']},
                        {'$set': {'eligibleFaculty': [ObjectId(chosen_id)]}}
                    )
                elif not dept_faculty_pool:
                    diagnostics.append(
                        f"Subject {s_code} has no assigned teacher and no department teachers are available."
                    )
                    fatal_errors = True
                else:
                    diagnostics.append(
                        f"Subject {s_code} has no assigned teacher (auto-fallback is disabled)."
                    )
                    fatal_errors = True
            elif eligible != raw_eligible:
                s['eligibleFaculty'] = [ObjectId(eid) for eid in eligible]
                db["subjects"].update_one(
                    {'_id': s['_id']},
                    {'$set': {'eligibleFaculty': [ObjectId(eid) for eid in eligible]}}
                )

            for fid in eligible:
                eligible_faculty_ids.add(str(fid))

        # Solver faculty list — only teachers assigned to subjects this run
        faculties = [f for f in dept_faculty_pool if f['id'] in eligible_faculty_ids]

        if not faculties and dept_faculty_pool:
            faculties = dept_faculty_pool

        if not faculties:
            diagnostics.append(
                f"No active teachers available to teach {req.department} Semester {req.semester}."
            )
            fatal_errors = True

        # Validate Rooms
        rooms = []
        lab_rooms = 0
        theory_rooms = 0
        for r in raw_rooms:
            # Normalize type: LECTURE → THEORY, None/missing → THEORY
            r_type = str(r.get('type') or 'LECTURE').upper().strip()
            if r_type in ('LECTURE', 'CLASSROOM', ''):
                r_type = 'THEORY'
            if r_type == 'LAB':
                lab_rooms += 1
            if r_type == 'THEORY':
                theory_rooms += 1
            # Parse capacity as int (DB may store it as string)
            try:
                capacity = int(r.get('capacity') or 60)
            except (ValueError, TypeError):
                capacity = 60
            rooms.append({
                'id': str(r['_id']),
                'type': r_type,
                'capacity': capacity
            })

        if not rooms:
            diagnostics.append("No active rooms found in the system.")
            fatal_errors = True
            
        # Validate Subject Capacity & Types
        subjects = []
        total_hours = 0
        lab_hours = 0
        theory_hours = 0
        
        for s in raw_subjects:
            # Credits = weekly class periods (1 credit → 1 period/week)
            hours = int(s.get('hoursPerWeek') or s.get('credits') or 3)
            total_hours += hours
            s_type = s.get('type', 'THEORY').upper()
            
            if s_type == 'LAB':
                lab_hours += hours
            elif s_type == 'THEORY':
                theory_hours += hours
                
            subjects.append({
                'id': str(s['_id']),
                'code': s.get('code', ''),
                'hoursPerWeek': hours,
                'credits': int(s.get('credits') or hours),
                'type': s_type,
                'eligibleFaculty': [str(fid) for fid in s.get('eligibleFaculty', [])],
                'semester': s.get('semester', req.semester),
                'department': s.get('department', req.department)
            })
            
        MAX_SLOTS = 36 # 6 days * 6 periods
        if total_hours > MAX_SLOTS:
            diagnostics.append(f"{req.department} Semester {req.semester} requires {total_hours} hours but only {MAX_SLOTS} slots exist.")
            fatal_errors = True
            
        if lab_hours > 0 and lab_rooms == 0:
            diagnostics.append(f"Lab subjects require {lab_hours} hours, but no LAB rooms are available.")
            fatal_errors = True
            
        if theory_hours > 0 and theory_rooms == 0:
            diagnostics.append(f"Theory subjects require {theory_hours} hours, but no THEORY/LECTURE rooms are available.")
            fatal_errors = True
            
        # Validate Faculty Load
        total_faculty_capacity = sum(f['maxHoursPerWeek'] for f in faculties)
        if total_hours > total_faculty_capacity:
            diagnostics.append(f"Total required hours ({total_hours}) exceeds total available faculty capacity ({total_faculty_capacity}).")
            fatal_errors = True

        # ----------------------------------------------------------------
        # 3. ROOM CAPACITY & BATCH SPLITTING
        # ----------------------------------------------------------------
        batch_strength = 60
        max_theory_cap = max([r['capacity'] for r in rooms if r['type'] == 'THEORY'] + [0])
        max_lab_cap = max([r['capacity'] for r in rooms if r['type'] == 'LAB'] + [0])
        
        batch_id = f"batch_{req.department}_{req.semester}"
        batches = []
        
        split_needed = False
        if lab_hours > 0 and max_lab_cap < batch_strength:
            split_needed = True
            fixes_applied.append(f"Max lab capacity is {max_lab_cap}, but batch is {batch_strength}. Auto-splitting batch into two sections.")
        elif theory_hours > 0 and max_theory_cap < batch_strength:
            split_needed = True
            fixes_applied.append(f"Max theory capacity is {max_theory_cap}, but batch is {batch_strength}. Auto-splitting batch into two sections.")
            
        if split_needed:
            half_strength = batch_strength // 2
            if (lab_hours > 0 and max_lab_cap < half_strength) or (theory_hours > 0 and max_theory_cap < half_strength):
                diagnostics.append(f"Rooms are too small even for a split batch (needs {half_strength} capacity).")
                fatal_errors = True
            else:
                batches = [
                    {
                        'id': f"{batch_id}_A",
                        'name': f"{req.department} - Sem {req.semester} (A)",
                        'semester': req.semester,
                        'section': 'A',
                        'strength': half_strength
                    },
                    {
                        'id': f"{batch_id}_B",
                        'name': f"{req.department} - Sem {req.semester} (B)",
                        'semester': req.semester,
                        'section': 'B',
                        'strength': batch_strength - half_strength
                    }
                ]
                
                # Splitting the batch means subjects are taught to multiple sections, doubling the faculty workload
                if (total_hours * 2) > total_faculty_capacity:
                    diagnostics.append(f"After splitting batch, required faculty hours ({total_hours * 2}) exceeds faculty capacity ({total_faculty_capacity}).")
                    fatal_errors = True
        else:
            batches = [{
                'id': batch_id,
                'name': f"{req.department} - Sem {req.semester}",
                'semester': req.semester,
                'section': 'A',
                'strength': batch_strength
            }]

        if fatal_errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Validation failed",
                    "diagnostics": diagnostics,
                    "fixes": fixes_applied
                }
            )

        # ----------------------------------------------------------------
        # 4. RUN CSP SOLVER
        # ----------------------------------------------------------------
        solver_result = solve(
            faculties=faculties,
            subjects=subjects,
            rooms=rooms,
            batches=batches,
            constraints=raw_constraints,
            timeout_seconds=req.timeout
        )

        if solver_result['status'] == 'INFEASIBLE':
            diagnostics_infeasible = [
                "Solver could not find a conflict-free timetable.",
                f"Required Hours: {total_hours}, Available Slots: {MAX_SLOTS}.",
                f"Eligible Faculty: {len(faculties)}, Available Rooms: {len(rooms)}.",
                "Check for highly restrictive faculty availability or isolated constraints."
            ]
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Constraint solving failed",
                    "diagnostics": diagnostics_infeasible,
                    "fixes": fixes_applied
                }
            )

        # ----------------------------------------------------------------
        # 5. FORMAT SLOTS FOR MONGODB
        # ----------------------------------------------------------------
        formatted_slots = []
        for assignment in solver_result['assignments']:
            start_t, end_t = get_period_times(assignment['period'])
            formatted_slots.append({
                "_id": ObjectId(),
                "day": DAY_REVERSE_MAP[assignment['day']],
                "period": assignment['period'],
                "startTime": start_t,
                "endTime": end_t,
                "subjectId": ObjectId(assignment['subjectId']),
                "facultyId": ObjectId(assignment['facultyId']),
                "roomId": ObjectId(assignment['roomId']),
                "batch": assignment['batchId'],
                "section": assignment.get('section', 'A'),
                "isLab": (
                    next(
                        (s for s in subjects if s['id'] == assignment['subjectId']),
                        {}
                    ).get('type', 'THEORY') == 'LAB'
                )
            })

        if not formatted_slots:
            raise HTTPException(
                status_code=409,
                detail="CSP solver returned no assignments. Please check faculty-subject mappings."
            )

        # ----------------------------------------------------------------
        # 6. PERSIST: ARCHIVE OLD → INSERT NEW
        # ----------------------------------------------------------------
        # Archive any existing published timetable for this dept/semester
        db["timetables"].update_many(
            {
                "status": "PUBLISHED",
                "semesterId": str(req.semester),
                "department": req.department.upper(),
            },
            {"$set": {"status": "ARCHIVED"}}
        )

        timetable_doc = {
            "semesterId": str(req.semester),
            "department": req.department.upper(),
            "academicYear": req.academicYear,
            "generatedAt": datetime.utcnow(),
            "status": "PUBLISHED",
            "algorithm": "OR_TOOLS_CSP_SYNC",
            "solvingTimeMs": solver_result['solvingTimeMs'],
            "slots": formatted_slots,
            "conflictCount": solver_result['conflictCount'],
            "fairnessScore": 100,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        result_db = db["timetables"].insert_one(timetable_doc)
        timetable_id = str(result_db.inserted_id)

        return {
            "status": "SUCCESS",
            "timetableId": timetable_id,
            "message": f"Timetable generated successfully for {req.department} Sem {req.semester}",
            "stats": {
                "totalSlots": len(formatted_slots),
                "solvingTimeMs": solver_result['solvingTimeMs'],
                "solverStatus": solver_result['status'],
                "conflictCount": solver_result['conflictCount'],
                "subjectsScheduled": len(set(s['subjectId'] for s in formatted_slots)),
                "facultyInvolved": len(set(s['facultyId'] for s in formatted_slots)),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during timetable generation: {str(e)}"
        )
    finally:
        client.close()
