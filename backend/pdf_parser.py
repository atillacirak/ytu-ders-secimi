# -*- coding: utf-8 -*-
import pdfplumber
import re
from typing import List, Dict, Optional
from models import DepartmentSchedule, Course, Section, TimeSlot

DAYS = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESI', 'PAZAR']
DAYS_MAP = {
    'PAZARTESİ': 'Pazartesi', 'PA': 'Pazartesi', 'ZA': 'Pazartesi', 'R': 'Pazartesi', 'T': 'Pazartesi', 'E': 'Pazartesi', 'S': 'Pazartesi', 'İ': 'Pazartesi',
    'SALI': 'Salı', 'SA': 'Salı', 'L': 'Salı', 'I': 'Salı',
    'ÇARŞAMBA': 'Çarşamba', 'Ç': 'Çarşamba', 'A': 'Çarşamba', 'ŞAM': 'Çarşamba', 'BA': 'Çarşamba',
    'PERŞEMBE': 'Perşembe', 'PER': 'Perşembe', 'ŞEM': 'Perşembe', 'BE': 'Perşembe',
    'CUMA': 'Cuma', 'CU': 'Cuma', 'M': 'Cuma',
    'CUMARTESİ': 'Cumartesi', 'C': 'Cumartesi', 'TS': 'Cumartesi',
    'PAZAR': 'Pazar'
}

def parse_ytu_pdf(pdf_path: str) -> DepartmentSchedule:
    schedule = DepartmentSchedule(department='Bilgisayar Mühendisliği', academic_year='2026-2027 GÜZ')
    
    courses_dict: Dict[str, Course] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                current_day = 'Pazartesi'
                for row in table:
                    if not row or len(row) < 3:
                        continue
                    
                    # Gün kontrolü
                    first_cell = str(row[0]).strip().replace('\n', '').upper() if row[0] else ''
                    for d_key, d_val in DAYS_MAP.items():
                        if d_key in first_cell:
                            current_day = d_val
                            break
                    
                    time_cell = str(row[1]).strip() if len(row) > 1 and row[1] else ''
                    if not re.match(r'\d{2}[.:]\d{2}-\d{2}[.:]\d{2}', time_cell):
                        continue
                    
                    parts = time_cell.split('-')
                    start_time = parts[0].replace(':', '.')
                    end_time = parts[1].replace(':', '.')

                    # Yıllar (1. YIL, 2. YIL, 3. YIL, 4. YIL)
                    year_cells = row[2:]
                    for y_idx, cell in enumerate(year_cells):
                        if not cell:
                            continue
                        year_num = y_idx + 1
                        lines = [line.strip() for line in str(cell).split('\n') if line.strip()]
                        if not lines:
                            continue

                        # Örnek hücre:
                        # Line 0: MAT1071 Matematik 1
                        # Line 1: HTK Gr1
                        # Line 2: DB11
                        
                        full_text = ' '.join(lines)
                        # Course Code bul (örn BLM3021, MAT1071, FIZ1001)
                        code_match = re.search(r'([A-Z]{3,4}\d{4})', full_text)
                        if not code_match:
                            continue
                        
                        code = code_match.group(1)
                        course_name = full_text.split(code)[-1].split('Gr')[0].strip()
                        if not course_name:
                            course_name = code

                        if code not in courses_dict:
                            courses_dict[code] = Course(
                                code=code,
                                name=course_name,
                                year=year_num,
                                sections=[]
                            )

                        # Group / Instructor / Room parsing
                        gr_matches = re.findall(r'(?:([A-ZÇĞİÖŞÜ]{2,4})\s+)?(Gr\d+|Gr:\s*\d+|Gr:\s*\d+,\s*\d+)', full_text)
                        room_match = re.search(r'(D\d{3}|DB\d{2}|D007|Online)', full_text)
                        classroom = room_match.group(1) if room_match else 'TBA'

                        if gr_matches:
                            for inst, gr in gr_matches:
                                section_id = gr.replace(' ', '')
                                instructor = inst if inst else 'Bölüm Öğr. El.'
                                
                                # Course altında section var mı
                                target_course = courses_dict[code]
                                sec = next((s for s in target_course.sections if s.section_id == section_id), None)
                                if not sec:
                                    sec = Section(section_id=section_id, instructor=instructor, time_slots=[])
                                    target_course.sections.append(sec)

                                # Slot ekle
                                slot = TimeSlot(
                                    day=current_day,
                                    start_time=start_time,
                                    end_time=end_time,
                                    classroom=classroom
                                )
                                sec.time_slots.append(slot)
                        else:
                            # Varsayılan Gr1
                            section_id = 'Gr1'
                            target_course = courses_dict[code]
                            sec = next((s for s in target_course.sections if s.section_id == section_id), None)
                            if not sec:
                                sec = Section(section_id=section_id, instructor='Bölüm Öğr. El.', time_slots=[])
                                target_course.sections.append(sec)
                            
                            slot = TimeSlot(
                                day=current_day,
                                start_time=start_time,
                                end_time=end_time,
                                classroom=classroom
                            )
                            sec.time_slots.append(slot)

    schedule.courses = list(courses_dict.values())
    return schedule
