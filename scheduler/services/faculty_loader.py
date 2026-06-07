"""
Load faculty for the CSP solver from the college `teachers` collection.
Falls back to legacy `faculties` collection (seed data) only when no teachers exist.
"""

from typing import List, Tuple, Dict, Any, Optional

DAY_MAP = {'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4, 'SAT': 5}

# Map short dept codes (UI) → substrings in departments.name
DEPT_ALIASES = {
    'CSE': ['computer science and engineering', 'computer science & engineering'],
    'ECE': ['electronics and communication', 'electronics & communication'],
    'CIVIL': ['civil engineering'],
    'EEE': ['electrical engineering'],
    'MECH': ['mechanical engineering'],
    'IT': ['information technology'],
    'AIDS': ['artificial intelligence', 'data science'],
    'AIML': ['machine learning', 'aiml'],
    'MCA': ['computer applications'],
    'BCA': ['computer applications'],
    'BBA': ['management', 'business'],
    'LAW': ['law'],
    'AS': ['applied sciences', 'applied science'],
}

DEFAULT_AVAILABILITY = [
    {'day': day, 'slots': [1, 2, 3, 4, 5, 6]}
    for day in ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
]


def resolve_department_object_ids(db, dept_code: str) -> List[Any]:
    """Resolve UI department code (e.g. CSE) to MongoDB department ObjectIds."""
    code = dept_code.upper().strip()
    depts = list(db['departments'].find({}))

    if not depts:
        return []

    # Exact short code on department document
    for d in depts:
        short = str(d.get('code') or d.get('shortCode') or '').upper().strip()
        if short and short == code:
            return [d['_id']]

    aliases = DEPT_ALIASES.get(code, [code.lower().replace('_', ' ')])
    matched = []
    for d in depts:
        name = (d.get('name') or d.get('departmentName') or '').lower()
        for alias in aliases:
            if alias in name:
                matched.append(d['_id'])
                break

    return matched


def _normalize_availability(raw_avail: list) -> list:
    avail = []
    if raw_avail:
        for a in raw_avail:
            day = a.get('day', 'MON')
            if isinstance(day, int):
                day_idx = day
            else:
                day_idx = DAY_MAP.get(str(day).upper(), 0)
            slots = a.get('availableSlots', a.get('slots', [1, 2, 3, 4, 5, 6]))
            avail.append({'day': day_idx, 'slots': slots})
    else:
        for entry in DEFAULT_AVAILABILITY:
            avail.append({
                'day': DAY_MAP[entry['day']],
                'slots': entry['slots'],
            })
    return avail


def _teacher_to_solver_faculty(teacher: dict, dept_code: str) -> dict:
    max_hrs = (
        teacher.get('maxHoursPerWeek')
        or teacher.get('maxHoursMs')
        or teacher.get('maxHours')
        or 20
    )
    try:
        max_hrs = int(max_hrs)
    except (TypeError, ValueError):
        max_hrs = 20

    return {
        'id': str(teacher['_id']),
        'name': teacher.get('name', 'Unknown'),
        'maxHoursPerWeek': max_hrs,
        'availability': _normalize_availability(teacher.get('availability', [])),
        'department': dept_code.upper(),
        'email': teacher.get('email', ''),
        'source': 'teachers',
    }


def _faculty_to_solver_faculty(faculty: dict) -> dict:
    avail = []
    for a in faculty.get('availability', []):
        avail.append({
            'day': DAY_MAP.get(a.get('day', 'MON'), 0),
            'slots': a.get('availableSlots', [1, 2, 3, 4, 5, 6]),
        })
    if not avail:
        avail = _normalize_availability([])

    return {
        'id': str(faculty['_id']),
        'name': faculty.get('name', 'Unknown'),
        'maxHoursPerWeek': faculty.get('maxHoursPerWeek', 40),
        'availability': avail,
        'department': str(faculty.get('department', '')).upper(),
        'source': 'faculties',
    }


def load_faculty_for_department(db, dept_code: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Returns (faculty_list_for_solver, source_collection_name).
    Prefers `teachers` (college data) over `faculties` (seed/legacy).
    """
    dept_code = dept_code.upper().strip()
    dept_ids = resolve_department_object_ids(db, dept_code)

    teacher_query: dict = {
        '$or': [
            {'status': 'active'},
            {'status': 'ACTIVE'},
            {'status': {'$exists': False}},
            {'isActive': True},
        ]
    }
    if dept_ids:
        teacher_query['department'] = {'$in': dept_ids}

    teachers = list(db['teachers'].find(teacher_query).sort('name', 1))

    if teachers:
        return [_teacher_to_solver_faculty(t, dept_code) for t in teachers], 'teachers'

    # Legacy fallback: seed `faculties` collection
    fac_query = {'isActive': True}
    fac_query['department'] = {'$regex': f'^{dept_code}$', '$options': 'i'}
    faculties = list(db['faculties'].find(fac_query))

    if not faculties:
        faculties = list(db['faculties'].find({'isActive': True}))

    return [_faculty_to_solver_faculty(f) for f in faculties], 'faculties'


def valid_faculty_id_set(faculties: List[Dict[str, Any]]) -> set:
    return {f['id'] for f in faculties}


def filter_eligible_to_real_faculty(eligible_ids: list, valid_ids: set) -> list:
    """Drop stale seed faculty IDs that are not in the current teacher pool."""
    return [str(fid) for fid in eligible_ids if str(fid) in valid_ids]
