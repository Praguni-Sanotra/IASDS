import time
from ortools.sat.python import cp_model

def solve(faculties, subjects, rooms, batches, constraints, timeout_seconds=60):
    """
    Solves the academic timetabling Constraint Satisfaction Problem.
    
    Inputs:
        faculties: list of dicts, e.g., {'id': 'f1', 'name': 'Dr. Smith', 'maxHoursPerWeek': 15, 'availability': [{'day': 0, 'slots': [0, 1, 2]}]}
        subjects: list of dicts, e.g., {'id': 's1', 'code': 'CS101', 'hoursPerWeek': 3, 'type': 'THEORY', 'eligibleFaculty': ['f1'], 'semester': 1}
        rooms: list of dicts, e.g., {'id': 'r1', 'type': 'THEORY', 'capacity': 60}
        batches: list of dicts, e.g., {'id': 'b1', 'name': 'CS-A', 'section': 'A', 'semester': 1, 'strength': 50}
        constraints: list of dicts determining soft constraint penalties and active hard constraints.
    """
    
    start_time = time.time()
    model = cp_model.CpModel()
    
    # ----------------------------------------------------------------------
    # PARSE CONSTRAINTS & CONFIG
    # ----------------------------------------------------------------------
    # Convert lists to dictionaries for fast lookup
    faculty_dict = {f['id']: f for f in faculties}
    subject_dict = {s['id']: s for s in subjects}
    room_dict = {r['id']: r for r in rooms}
    batch_dict = {b['id']: b for b in batches}
    
    DAYS = 6  # Mon(0) to Sat(5)
    PERIODS = 8 # 0 to 7
    
    # Pre-process faculty availability
    # faculty_avail[f_id][day] = set of available periods
    faculty_avail = {}
    for f in faculties:
        avail_map = {d: set() for d in range(DAYS)}
        # If availability is empty/not provided, assume available all the time (or modify as needed)
        provided_avail = f.get('availability', [])
        if not provided_avail:
            for d in range(DAYS):
                avail_map[d] = set(range(PERIODS))
        else:
            for a in provided_avail:
                avail_map[a['day']] = set(a.get('slots', []))
        faculty_avail[f['id']] = avail_map

    # ----------------------------------------------------------------------
    # DECISION VARIABLES
    # ----------------------------------------------------------------------
    # x[b_id, s_id, f_id, r_id, d, p] = 1 if batch b takes subject s with faculty f in room r on day d, period p
    x = {}
    
    # Store variable keys grouped by different dimensions for fast constraint building
    by_faculty_time = {f['id']: {d: {p: [] for p in range(PERIODS)} for d in range(DAYS)} for f in faculties}
    by_room_time = {r['id']: {d: {p: [] for p in range(PERIODS)} for d in range(DAYS)} for r in rooms}
    by_batch_time = {b['id']: {d: {p: [] for p in range(PERIODS)} for d in range(DAYS)} for b in batches}
    by_batch_subject = {b['id']: {s['id']: [] for s in subjects} for b in batches}
    by_faculty = {f['id']: [] for f in faculties}
    by_faculty_day = {f['id']: {d: [] for d in range(DAYS)} for f in faculties}

    valid_vars_created = 0

    for b in batches:
        for s in subjects:
            # Only schedule subjects matching the batch's semester
            if b.get('semester') != s.get('semester'):
                continue
                
            # Filter eligible faculties
            eligible_faculties = [f for f in faculties if f['id'] in s.get('eligibleFaculty', [])]
            
            # Filter valid rooms: matching type and sufficient capacity
            valid_rooms = [r for r in rooms if r.get('type') == s.get('type') and r.get('capacity', 0) >= b.get('strength', 0)]
            
            for f in eligible_faculties:
                for d in range(DAYS):
                    for p in range(PERIODS):
                        # HARD CONSTRAINT 5: Faculty must be available at this time
                        if p not in faculty_avail[f['id']][d]:
                            continue
                            
                        for r in valid_rooms:
                            # Create boolean variable
                            var_name = f"x_{b['id']}_{s['id']}_{f['id']}_{r['id']}_d{d}_p{p}"
                            var = model.NewBoolVar(var_name)
                            
                            key = (b['id'], s['id'], f['id'], r['id'], d, p)
                            x[key] = var
                            valid_vars_created += 1
                            
                            # Group variables
                            by_faculty_time[f['id']][d][p].append(var)
                            by_room_time[r['id']][d][p].append(var)
                            by_batch_time[b['id']][d][p].append(var)
                            by_batch_subject[b['id']][s['id']].append(var)
                            by_faculty[f['id']].append(var)
                            by_faculty_day[f['id']][d].append(var)

    # ----------------------------------------------------------------------
    # HARD CONSTRAINTS
    # ----------------------------------------------------------------------
    
    # 1. No faculty double-booking
    for f_id in by_faculty_time:
        for d in range(DAYS):
            for p in range(PERIODS):
                model.Add(sum(by_faculty_time[f_id][d][p]) <= 1)

    # 2. No room double-booking
    for r_id in by_room_time:
        for d in range(DAYS):
            for p in range(PERIODS):
                model.Add(sum(by_room_time[r_id][d][p]) <= 1)
                
    # 3. No batch double-booking
    for b_id in by_batch_time:
        for d in range(DAYS):
            for p in range(PERIODS):
                model.Add(sum(by_batch_time[b_id][d][p]) <= 1)

    # 4. Each subject must meet its required hoursPerWeek for each valid batch
    for b in batches:
        for s in subjects:
            if b.get('semester') == s.get('semester'):
                req_hours = s.get('hoursPerWeek', 0)
                model.Add(sum(by_batch_subject[b['id']][s['id']]) == req_hours)

    # 5. Faculty max hours per week
    for f in faculties:
        max_hrs = f.get('maxHoursPerWeek', 40)
        model.Add(sum(by_faculty[f['id']]) <= max_hrs)

    # ----------------------------------------------------------------------
    # SOFT CONSTRAINTS & OBJECTIVE FUNCTION
    # ----------------------------------------------------------------------
    objective_terms = []

    # Soft Constraint: Avoid scheduling labs in the first or last period
    # We add a penalty to the objective if a lab is scheduled at p=0 or p=PERIODS-1
    for key, var in x.items():
        b_id, s_id, f_id, r_id, d, p = key
        if subject_dict[s_id].get('type') == 'LAB':
            if p == 0 or p == PERIODS - 1:
                # Penalty of -10 for objective (we maximize, so we use negative weights for penalties)
                objective_terms.append(-10 * var)
                
    # Soft Constraint: Minimize gaps in faculty schedule (Avoid isolated free periods)
    # If a faculty teaches at p=0 and p=2, but not p=1, that's a gap.
    # To model this simply in CP-SAT without complex automatons:
    # We penalize transitions. A simpler proxy is to reward consecutive classes.
    # For every day and period p, if f teaches at p and p+1, reward it.
    for f_id in by_faculty_time:
        for d in range(DAYS):
            for p in range(PERIODS - 1):
                # Create a boolean that is true if faculty teaches both period p and p+1
                vars_p = by_faculty_time[f_id][d][p]
                vars_next = by_faculty_time[f_id][d][p+1]
                if vars_p and vars_next:
                    is_consecutive = model.NewBoolVar(f'consec_{f_id}_d{d}_p{p}')
                    # is_consecutive can only be 1 if sum(vars_p) >= 1 AND sum(vars_next) >= 1
                    # Since sum(vars_p) <= 1, we can just say:
                    # is_consecutive <= sum(vars_p)
                    # is_consecutive <= sum(vars_next)
                    model.Add(is_consecutive <= sum(vars_p))
                    model.Add(is_consecutive <= sum(vars_next))
                    
                    # Reward consecutive assignments (minimize gaps)
                    objective_terms.append(5 * is_consecutive)

    # Set the objective: Maximize the rewards (minimize penalties)
    if objective_terms:
        model.Maximize(sum(objective_terms))

    # ----------------------------------------------------------------------
    # SOLVE
    # ----------------------------------------------------------------------
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    
    status = solver.Solve(model)
    
    solve_time_ms = int((time.time() - start_time) * 1000)
    
    result_status = 'INFEASIBLE'
    assignments = []
    conflict_count = 0

    if status == cp_model.OPTIMAL:
        result_status = 'OPTIMAL'
    elif status == cp_model.FEASIBLE:
        result_status = 'FEASIBLE'
        
    if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        # Extract the schedule
        for key, var in x.items():
            if solver.Value(var) == 1:
                b_id, s_id, f_id, r_id, d, p = key
                assignments.append({
                    'day': d,
                    'period': p,
                    'subjectId': s_id,
                    'facultyId': f_id,
                    'roomId': r_id,
                    'batchId': b_id,
                    'section': batch_dict[b_id].get('section', 'A')
                })
    else:
        # If infeasible, conflict count could be estimated by constraints
        conflict_count = 1

    return {
        'assignments': assignments,
        'solvingTimeMs': solve_time_ms,
        'status': result_status,
        'conflictCount': conflict_count
    }
