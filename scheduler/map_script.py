import os
from pymongo import MongoClient

client = MongoClient('mongodb+srv://Table:table123@cluster0.w030zx1.mongodb.net/hybridtimetable?retryWrites=true&w=majority')
db = client['hybridtimetable']

faculties = list(db.faculties.find({'isActive': True}))
dept_faculties = {}
for f in faculties:
    d = str(f.get('department', '')).upper().strip()
    if d not in dept_faculties:
        dept_faculties[d] = []
    dept_faculties[d].append(f)

for d in dept_faculties:
    dept_faculties[d].sort(key=lambda x: str(x['_id']))

with open('mapping_report.md', 'w', encoding='utf-8') as f:
    f.write('# Subject to Faculty Mapping Report\n\n')
    
    subjects = list(db.subjects.find({'isActive': True}))
    faculty_load = {str(fac['_id']): 0 for fac in faculties}
    
    updated_count = 0
    for sub in subjects:
        sub_dept = str(sub.get('department', '')).upper().strip()
        matched_facs = []
        
        # Match CSE with "Department of Computer Science & Engineering"
        if sub_dept == 'CSE' or 'COMPUTER' in sub_dept:
            for d in dept_faculties:
                if d == 'CSE' or 'COMPUTER' in d:
                    matched_facs.extend(dept_faculties[d])
        else:
            for d in dept_faculties:
                if d == sub_dept or sub_dept in d or d in sub_dept:
                    matched_facs.extend(dept_faculties[d])
                    break
        
        matched_facs = list({str(x['_id']): x for x in matched_facs}.values())
        
        if matched_facs:
            matched_facs.sort(key=lambda x: faculty_load[str(x['_id'])])
            assigned = matched_facs[:2]
            
            for a in assigned:
                faculty_load[str(a['_id'])] += 1
                
            assigned_ids = [a['_id'] for a in assigned]
            
            db.subjects.update_one({'_id': sub['_id']}, {'$set': {'eligibleFaculty': assigned_ids}})
            updated_count += 1
            
            if sub_dept == 'CSE' or sub.get('semester') in [7, 8]:
                f.write(f'- **[{sub.get("code")}] {sub.get("name")}** (Sem {sub.get("semester")}, {sub.get("type")})\n')
                for a in assigned:
                    f.write(f'  - {a.get("name")} ({a.get("designation", "Faculty")})\n')

    f.write(f'\nTotal subjects updated: {updated_count}\n')
print("Mapping complete!")
