from typing import List, Dict, Any

def reschedule(req: Dict[str, Any]) -> Dict[str, Any]:
    """
    Local Search Greedy Repair Algorithm for rescheduling.
    """
    trigger = req['triggerType']
    affected_id = req['affectedEntityId']
    affected_day = req['affectedDay']
    affected_periods = req['affectedPeriods']
    
    all_slots = req['allSlots']
    faculties = req['faculties']
    subjects = {s['id']: s for s in req['subjects']}
    rooms = req['rooms']
    
    updated_slots = []
    replacements = []
    unresolved = []
    
    # 1. Identify affected slots
    affected_slots = []
    for slot in all_slots:
        is_affected = False
        if trigger == "FACULTY_ABSENT" and slot['facultyId'] == affected_id:
            is_affected = True
        elif trigger == "ROOM_UNAVAILABLE" and slot['roomId'] == affected_id:
            is_affected = True
        elif trigger == "MANUAL_MOVE" and slot['facultyId'] == affected_id: # Usually for a specific slot
            # Manual move logic is slightly different, it targets a specific unique class assignment
            # But let's assume affected_periods identifies the specific slot
            pass

        if is_affected and slot['day'] == affected_day and slot['period'] in affected_periods:
            affected_slots.append(slot)

    # 2. Process Manual Move (Special Case)
    if trigger == "MANUAL_MOVE":
        target_day = req.get('targetDay')
        target_period = req.get('targetPeriod')
        
        # Check for conflicts in the target slot
        target_conflicts = []
        for slot in all_slots:
            if slot['day'] == target_day and slot['period'] == target_period:
                if slot['facultyId'] == affected_id:
                    target_conflicts.append("Faculty Conflict")
                if slot['roomId'] == req.get('replacementEntityId'):
                    target_conflicts.append("Room Conflict")
        
        if target_conflicts:
            return {"status": "CONFLICT", "conflicts": target_conflicts}
        
        # If no conflicts, update the single slot (assuming one for manual move)
        # In a real app, we'd identify the specific slot object index
        return {
            "status": "SUCCESS",
            "updatedSlots": [{"day": target_day, "period": target_period}],
            "affectedCount": 1
        }

    # 3. Greedy Repair for Faculty/Room unavailability
    for slot in affected_slots:
        found_replacement = False
        
        if trigger == "FACULTY_ABSENT":
            # Find eligible faculty who is free
            subject = subjects.get(slot['subjectId'], {})
            eligible_ids = subject.get('eligibleFaculty', [])
            
            # Find candidate
            for f in faculties:
                if f['id'] in eligible_ids and f['id'] != affected_id:
                    # Check if this candidate f is free at slot['day'], slot['period']
                    is_busy = any(s['facultyId'] == f['id'] and s['day'] == slot['day'] and s['period'] == slot['period'] for s in all_slots)
                    if not is_busy:
                        # Success
                        updated_slots.append({**slot, "facultyId": f['id']})
                        replacements.append({"original": affected_id, "replacement": f['id'], "reason": "Faculty Substitute"})
                        found_replacement = True
                        break
        
        elif trigger == "ROOM_UNAVAILABLE":
            # Find alternative room of same type with capacity
            current_room = next((r for r in rooms if r['id'] == affected_id), None)
            for r in rooms:
                if r['id'] != affected_id and r['type'] == current_room['type'] and r['capacity'] >= current_room['capacity']:
                    # Check if free
                    is_busy = any(s['roomId'] == r['id'] and s['day'] == slot['day'] and s['period'] == slot['period'] for s in all_slots)
                    if not is_busy:
                        updated_slots.append({**slot, "roomId": r['id']})
                        replacements.append({"original": affected_id, "replacement": r['id'], "reason": "Room Change"})
                        found_replacement = True
                        break
        
        if not found_replacement:
            unresolved.append(slot)

    return {
        "status": "SUCCESS",
        "updatedSlots": updated_slots,
        "affectedCount": len(updated_slots),
        "replacements": replacements,
        "unresolved": unresolved
    }
