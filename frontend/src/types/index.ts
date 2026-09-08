export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
  classroom?: string;
  is_lab_or_practice?: boolean;
}

export interface Section {
  section_id: string;
  instructor?: string;
  time_slots: TimeSlot[];
}

export interface Course {
  code: string;
  name: string;
  year: number;
  is_elective?: boolean;
  sections: Section[];
}

export interface DepartmentSchedule {
  department: string;
  academic_year: string;
  courses: Course[];
}

export interface OptimizationOptions {
  target_free_days: boolean;
  minimize_gaps: boolean;
  avoid_early_mornings: boolean;
  preferred_instructors?: Record<string, string>;
  locked_sections?: Record<string, string>;
}

export interface ScheduleCombination {
  selected_sections: Record<string, Section>;
  total_gap_hours: number;
  free_days_count: number;
  score: number;
}
