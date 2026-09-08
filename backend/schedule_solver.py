# -*- coding: utf-8 -*-
from typing import List, Dict, Tuple, Optional
from models import Course, Section, TimeSlot, OptimizationOptions, ScheduleCombination

DAYS_ORDER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

def time_to_minutes(time_str: str) -> int:
    clean_str = time_str.replace('.', ':')
    parts = clean_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    return hours * 60 + minutes

def slots_overlap(slot1: TimeSlot, slot2: TimeSlot) -> bool:
    if slot1.day != slot2.day:
        return False
    start1 = time_to_minutes(slot1.start_time)
    end1 = time_to_minutes(slot1.end_time)
    start2 = time_to_minutes(slot2.start_time)
    end2 = time_to_minutes(slot2.end_time)
    return max(start1, start2) < min(end1, end2)

def sections_overlap(sec1: Section, sec2: Section) -> bool:
    for s1 in sec1.time_slots:
        for s2 in sec2.time_slots:
            if slots_overlap(s1, s2):
                return True
    return False

def calculate_schedule_stats(selected_sections: Dict[str, Section]) -> Tuple[float, int, int]:
    day_slots: Dict[str, List[Tuple[int, int]]] = {day: [] for day in DAYS_ORDER}
    for course_code, sec in selected_sections.items():
        for slot in sec.time_slots:
            start_m = time_to_minutes(slot.start_time)
            end_m = time_to_minutes(slot.end_time)
            day_slots[slot.day].append((start_m, end_m))
            
    total_gap_minutes = 0
    used_days = 0
    early_mornings = 0
    
    for day, slots in day_slots.items():
        if not slots:
            continue
        used_days += 1
        slots.sort(key=lambda x: x[0])
        
        if slots[0][0] <= 8 * 60 + 30:
            early_mornings += 1
            
        for i in range(len(slots) - 1):
            gap = slots[i+1][0] - slots[i][1]
            if gap > 0:
                total_gap_minutes += gap
                
    free_days_count = len(DAYS_ORDER) - used_days
    total_gap_hours = total_gap_minutes / 60.0
    return total_gap_hours, free_days_count, early_mornings

def calculate_score(selected_sections: Dict[str, Section], options: OptimizationOptions) -> float:
    gap_hours, free_days, early_mornings = calculate_schedule_stats(selected_sections)
    score = 100.0
    if options.target_free_days:
        score += free_days * 30.0
    if options.minimize_gaps:
        score -= gap_hours * 15.0
    if options.avoid_early_mornings:
        score -= early_mornings * 20.0
    if options.preferred_instructors:
        for course_code, pref_inst in options.preferred_instructors.items():
            if course_code in selected_sections:
                sec = selected_sections[course_code]
                if sec.instructor and pref_inst.lower() in sec.instructor.lower():
                    score += 25.0
    return score

def generate_schedules(
    selected_courses: List[Course],
    options: OptimizationOptions,
    max_results: int = 50
) -> List[ScheduleCombination]:
    results: List[ScheduleCombination] = []
    locked = options.locked_sections or {}
    
    def backtrack(course_index: int, current_selection: Dict[str, Section]):
        if course_index == len(selected_courses):
            gap_hours, free_days, _ = calculate_schedule_stats(current_selection)
            score = calculate_score(current_selection, options)
            results.append(
                ScheduleCombination(
                    selected_sections=current_selection.copy(),
                    total_gap_hours=gap_hours,
                    free_days_count=free_days,
                    score=score
                )
            )
            return

        course = selected_courses[course_index]
        available_sections = course.sections
        if course.code in locked:
            target_sec_id = locked[course.code]
            available_sections = [s for s in course.sections if s.section_id == target_sec_id]
            if not available_sections:
                available_sections = course.sections

        for sec in available_sections:
            has_conflict = False
            for existing_course, existing_sec in current_selection.items():
                if sections_overlap(sec, existing_sec):
                    has_conflict = True
                    break
            if not has_conflict:
                current_selection[course.code] = sec
                backtrack(course_index + 1, current_selection)
                del current_selection[course.code]

    backtrack(0, {})
    results.sort(key=lambda x: x.score, reverse=True)
    return results[:max_results]
