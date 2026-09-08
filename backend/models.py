# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import List, Optional, Dict

class TimeSlot(BaseModel):
    day: str  # Pazartesi, Sali, Carsamba, Persembe, Cuma, Cumartesi, Pazar
    start_time: str
    end_time: str
    classroom: Optional[str] = None
    is_lab_or_practice: bool = False

class Section(BaseModel):
    section_id: str
    instructor: Optional[str] = None
    time_slots: List[TimeSlot] = []

class Course(BaseModel):
    code: str
    name: str
    year: int
    is_elective: bool = False
    sections: List[Section] = []

class DepartmentSchedule(BaseModel):
    department: str = 'Bilgisayar Muhendisligi'
    academic_year: str = '2026-2027 GUZ'
    courses: List[Course] = []

class OptimizationOptions(BaseModel):
    target_free_days: bool = False
    minimize_gaps: bool = False
    avoid_early_mornings: bool = False
    preferred_instructors: Optional[Dict[str, str]] = None
    locked_sections: Optional[Dict[str, str]] = None

class ScheduleCombination(BaseModel):
    selected_sections: Dict[str, Section]
    total_gap_hours: float
    free_days_count: int
    score: float
