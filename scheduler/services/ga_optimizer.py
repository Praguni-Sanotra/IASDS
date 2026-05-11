import random
import copy
from typing import List, Dict, Any
import numpy as np

# DEAP library
from deap import base, creator, tools, algorithms

def setup_deap():
    # Safely create DEAP classes (prevent re-creation errors in hot-reloads)
    if not hasattr(creator, "FitnessMax"):
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", list, fitness=creator.FitnessMax)

def compute_gini(workloads: List[int]) -> float:
    """Calculate the Gini coefficient of a numpy array."""
    array = np.array(workloads, dtype=np.float64)
    if np.amin(array) < 0:
        array -= np.amin(array) # Values cannot be negative
    array += 0.0000001 # Values cannot be 0
    array = np.sort(array) # Values must be sorted
    index = np.arange(1, array.shape[0] + 1)
    n = array.shape[0]
    return ((np.sum((2 * index - n  - 1) * array)) / (n * np.sum(array)))

def compute_fitness(individual, faculties, subjects_dict) -> tuple:
    """
    Evaluates the soft and hard constraints of an individual timetable.
    """
    score = 0
    
    # Tracking matrices
    faculty_workload = {f['id']: 0 for f in faculties}
    faculty_schedule = {f['id']: {d: set() for d in range(6)} for f in faculties}
    batch_schedule = {}
    room_schedule = {}
    
    # 1. Evaluate assignments and check hard constraint safety
    for gene in individual:
        d = gene['day']
        p = gene['period']
        f_id = gene['facultyId']
        r_id = gene['roomId']
        b_id = gene['batchId']
        s_id = gene['subjectId']
        
        # Hard constraint safety tracking
        # Batch double booking
        b_key = (b_id, d, p)
        if b_key not in batch_schedule:
            batch_schedule[b_key] = s_id
        else:
            score -= 50 # Batch double booked
            
        # Faculty double booking
        f_key = (f_id, d, p)
        if p in faculty_schedule[f_id][d]:
            score -= 50 # Faculty double booked
        else:
            faculty_schedule[f_id][d].add(p)
            
        # Room double booking
        r_key = (r_id, d, p)
        if r_key not in room_schedule:
            room_schedule[r_key] = True
        else:
            score -= 50 # Room double booked

        # Workload tracking
        faculty_workload[f_id] += 1
        
        # Preferred slots (mocking: prefer morning slots < 4)
        # Ideally, this checks faculty['preferredSlots']
        if p < 4:
            score += 15

    # 2. Evaluate Faculty Level Soft Constraints
    workloads = list(faculty_workload.values())
    avg_workload = sum(workloads) / len(workloads) if workloads else 0
    
    for f in faculties:
        f_id = f['id']
        load = faculty_workload[f_id]
        
        # Workload deviation
        if abs(load - avg_workload) <= 2:
            score += 30
            
        # Max hours check
        max_hrs = f.get('maxHoursPerWeek', 40)
        if load > max_hrs:
            score -= 20
            
        # Isolated free periods
        has_isolated = False
        for d in range(6):
            slots = sorted(list(faculty_schedule[f_id][d]))
            if len(slots) >= 2:
                for i in range(len(slots) - 1):
                    if slots[i+1] - slots[i] == 2:
                        has_isolated = True
                        break
            if has_isolated:
                break
                
        if not has_isolated and load > 0:
            score += 20

    # 3. Evaluate Subject Spread (No back-to-back same subject)
    # We aggregate batch schedule to day/period
    # batch_schedule maps (batchId, day, period) -> subjectId
    # Group by batch and day to check contiguous periods
    batch_day_map = {}
    for (b_id, d, p), s_id in batch_schedule.items():
        if b_id not in batch_day_map:
            batch_day_map[b_id] = {}
        if d not in batch_day_map[b_id]:
            batch_day_map[b_id][d] = {}
        batch_day_map[b_id][d][p] = s_id
        
    for b_id, days in batch_day_map.items():
        for d, periods in days.items():
            sorted_periods = sorted(periods.keys())
            has_back_to_back = False
            for i in range(len(sorted_periods)-1):
                p_current = sorted_periods[i]
                p_next = sorted_periods[i+1]
                if p_next - p_current == 1:
                    if periods[p_current] == periods[p_next]:
                        has_back_to_back = True
                        break
            if not has_back_to_back:
                score += 10

    return (score,)

def cx_day_based(ind1, ind2):
    """
    Day-based Crossover: Swaps all slots from 2 random days between parents.
    """
    d1, d2 = random.sample(range(6), 2)
    
    # Extract genes for those days
    genes1_d1 = [g for g in ind1 if g['day'] == d1]
    genes1_d2 = [g for g in ind1 if g['day'] == d2]
    genes2_d1 = [g for g in ind2 if g['day'] == d1]
    genes2_d2 = [g for g in ind2 if g['day'] == d2]
    
    # Remove original day genes
    ind1[:] = [g for g in ind1 if g['day'] not in (d1, d2)]
    ind2[:] = [g for g in ind2 if g['day'] not in (d1, d2)]
    
    # Swap
    ind1.extend(copy.deepcopy(genes2_d1) + copy.deepcopy(genes2_d2))
    ind2.extend(copy.deepcopy(genes1_d1) + copy.deepcopy(genes1_d2))
    
    return ind1, ind2

def mut_swap_slots(individual, indpb):
    """
    Mutation: Swaps two random slots while trying to maintain validity.
    Since deep hard constraint checking inside mutation is slow, we swap 
    (day, period) and rely on the fitness penalty to weed out invalid states.
    """
    if random.random() < indpb:
        if len(individual) >= 2:
            idx1, idx2 = random.sample(range(len(individual)), 2)
            
            # Swap day and period
            d1, p1 = individual[idx1]['day'], individual[idx1]['period']
            individual[idx1]['day'], individual[idx1]['period'] = individual[idx2]['day'], individual[idx2]['period']
            individual[idx2]['day'], individual[idx2]['period'] = d1, p1
            
    return (individual,)

def apply_fairness_repair(population, faculties, subjects_dict):
    """
    After each generation, if Gini > 0.3, redistribute one subject slot 
    from the most-loaded to the least-loaded faculty.
    """
    for ind in population:
        faculty_workload = {f['id']: 0 for f in faculties}
        for gene in ind:
            faculty_workload[gene['facultyId']] += 1
            
        workloads = list(faculty_workload.values())
        gini = compute_gini(workloads)
        
        if gini > 0.3:
            # Sort faculties by load
            sorted_f = sorted(faculty_workload.items(), key=lambda x: x[1])
            least_loaded_id = sorted_f[0][0]
            most_loaded_id = sorted_f[-1][0]
            
            # Find a gene taught by most_loaded that least_loaded is eligible for
            for gene in ind:
                if gene['facultyId'] == most_loaded_id:
                    s_id = gene['subjectId']
                    s_eligible = subjects_dict.get(s_id, {}).get('eligibleFaculty', [])
                    if least_loaded_id in s_eligible:
                        gene['facultyId'] = least_loaded_id
                        break

def optimize(initial_solution: List[Dict[str, Any]], faculties: List[Dict[str, Any]], 
             subjects: List[Dict[str, Any]], rooms: List[Dict[str, Any]], 
             config: Dict[str, Any], on_progress=None):
    """
    Main entrypoint for the GA Optimizer.
    """
    setup_deap()
    
    # Parameters
    pop_size = config.get('population_size', 50)
    generations = config.get('generations', 100)
    cxpb = config.get('cxpb', 0.7)
    mutpb = config.get('mutpb', 0.2)
    
    subjects_dict = {s['id']: s for s in subjects}
    
    toolbox = base.Toolbox()
    
    # We seed the population completely with permutations of the initial CSP solution
    def create_individual():
        ind = copy.deepcopy(initial_solution)
        # Apply slight random mutation to introduce diversity right away
        for _ in range(random.randint(1, 5)):
            mut_swap_slots(ind, 1.0)
        return creator.Individual(ind)

    toolbox.register("individual", create_individual)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    
    toolbox.register("evaluate", compute_fitness, faculties=faculties, subjects_dict=subjects_dict)
    toolbox.register("mate", cx_day_based)
    toolbox.register("mutate", mut_swap_slots, indpb=mutpb)
    toolbox.register("select", tools.selTournament, tournsize=3)
    
    # Generate initial population
    pop = toolbox.population(n=pop_size)
    
    # Calculate base CSP fitness
    initial_ind = creator.Individual(copy.deepcopy(initial_solution))
    initial_fitness = toolbox.evaluate(initial_ind)[0]
    initial_ind.fitness.values = (initial_fitness,)
    pop[0] = initial_ind # Keep pristine copy
    
    # Evaluate entire population
    fitnesses = list(map(toolbox.evaluate, pop))
    for ind, fit in zip(pop, fitnesses):
        ind.fitness.values = fit

    best_ind = pop[0]

    # Evolution
    for gen in range(generations):
        # Select next generation
        offspring = toolbox.select(pop, len(pop))
        offspring = list(map(toolbox.clone, offspring))
        
        # Apply crossover and mutation
        for child1, child2 in zip(offspring[::2], offspring[1::2]):
            if random.random() < cxpb:
                toolbox.mate(child1, child2)
                del child1.fitness.values
                del child2.fitness.values

        for mutant in offspring:
            toolbox.mutate(mutant)
            del mutant.fitness.values

        # Evaluate invalid individuals
        invalid_ind = [ind for ind in offspring if not ind.fitness.valid]
        fitnesses = map(toolbox.evaluate, invalid_ind)
        for ind, fit in zip(invalid_ind, fitnesses):
            ind.fitness.values = fit
            
        # Update population
        pop[:] = offspring
        
        # Fairness Repair Mechanism
        apply_fairness_repair(pop, faculties, subjects_dict)
        
        # Update best
        current_best = tools.selBest(pop, 1)[0]
        if current_best.fitness.values[0] > best_ind.fitness.values[0]:
            best_ind = copy.deepcopy(current_best)
            
        # Progress Callback
        if on_progress and gen % 10 == 0:
            on_progress(gen, best_ind.fitness.values[0])

    # Final stats
    final_fitness = best_ind.fitness.values[0]
    improvement = ((final_fitness - initial_fitness) / abs(initial_fitness)) * 100 if initial_fitness != 0 else 0.0
    
    # Calculate final Gini
    faculty_workload = {f['id']: 0 for f in faculties}
    for gene in best_ind:
        faculty_workload[gene['facultyId']] += 1
    final_gini = compute_gini(list(faculty_workload.values()))
    
    return {
        "best_timetable": list(best_ind),
        "fitness_score": final_fitness,
        "generations_run": generations,
        "fairness_gini": final_gini,
        "improvement_over_csp": improvement
    }
