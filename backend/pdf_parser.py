# -*- coding: utf-8 -*-
import pdfplumber
import re
from typing import List, Dict, Optional
from models import DepartmentSchedule, Course, Section, TimeSlot

DAYS = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESI', 'PAZAR']
DAYS_MAP = {
    'PAZARTESİ': 'Pazartesi', 'SALI': 'Salı', 'ÇARŞAMBA': 'Çarşamba', 'PERŞEMBE': 'Perşembe', 'CUMA': 'Cuma', 'CTS': 'Cumartesi', 'PAZAR': 'Pazar'
}

def parse_ytu_pdf(pdf_path: str) -> DepartmentSchedule:
    schedule = DepartmentSchedule(department='Bilgisayar Mühendisliği', academic_year='2026-2027 GÜZ')
    courses_dict: Dict[str, Course] = {}

    current_day = 'Pazartesi'

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                row_idx = 0
                while row_idx < len(table):
                    row = table[row_idx]
                    if not row or len(row) < 3:
                        row_idx += 1
                        continue

                    first_col = str(row[0] or '').replace('\n', '').replace(' ', '').upper()
                    for d_k in ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR']:
                        if d_k in first_col or d_k[:4] in first_col:
                            current_day = DAYS_MAP.get(d_k, current_day)
                            break

                    time_cell = str(row[1] or '').strip()
                    if not re.match(r'\d{2}[.:]\d{2}-\d{2}[.:]\d{2}', time_cell):
                        row_idx += 1
                        continue

                    for y_idx, cell in enumerate(row[2:], start=1):
                        if y_idx > 4 or not cell: continue
                        txt = str(cell).strip()
                        if not txt: continue

                        lines = [l.strip() for l in txt.split('\n') if l.strip()]
                        first_line = lines[0] if lines else ''

                        code_match = re.search(r'([A-Z]{3,4}\d{4})', first_line)
                        if code_match:
                            code = code_match.group(1)
                            name = first_line.replace(code, '').strip()
                            start_time = time_cell.split('-')[0].replace(':', '.')
                            end_time = time_cell.split('-')[1].replace(':', '.')
                            info_lines = lines[1:]

                            # Look ahead in consecutive rows for this column
                            next_r = row_idx + 1
                            while next_r < len(table):
                                next_row = table[next_r]
                                if not next_row or len(next_row) < 2 + y_idx:
                                    break
                                next_time = str(next_row[1] or '').strip()
                                if not re.match(r'\d{2}[.:]\d{2}-\d{2}[.:]\d{2}', next_time):
                                    break

                                next_cell = next_row[1 + y_idx]
                                if not next_cell or not str(next_cell).strip():
                                    end_time = next_time.split('-')[1].replace(':', '.')
                                    next_r += 1
                                    continue

                                next_lines = [l.strip() for l in str(next_cell).split('\n') if l.strip()]
                                next_first = next_lines[0] if next_lines else ''

                                if re.search(r'([A-Z]{3,4}\d{4})', next_first):
                                    break
                                else:
                                    end_time = next_time.split('-')[1].replace(':', '.')
                                    info_lines.extend(next_lines)
                                    next_r += 1

                            if code not in courses_dict:
                                courses_dict[code] = Course(
                                    code=code,
                                    name=name if name else code,
                                    year=y_idx,
                                    sections=[]
                                )

                            full_info_text = ' '.join(info_lines)
                            gr_matches = re.findall(r'(?:([A-ZÇĞİÖŞÜ]{2,4})\s+)?(Gr:?\s*\d+|Gr:?\s*\d+,\s*\d+|Gr\d+)', full_info_text)
                            rooms = re.findall(r'(D\d{3}|DB\d{2}|D007|Online)', full_info_text)
                            classroom = ", ".join(set(rooms)) if rooms else ('Online' if 'ONLINE' in (name + " " + full_info_text).upper() else 'Derslik')

                            if gr_matches:
                                for inst, gr in gr_matches:
                                    sec_id = gr.replace(' ', '').replace(':', '')
                                    instructor = inst if inst else 'Bölüm Öğr. El.'

                                    target_course = courses_dict[code]
                                    sec = next((s for s in target_course.sections if s.section_id == sec_id), None)
                                    if not sec:
                                        sec = Section(section_id=sec_id, instructor=instructor, time_slots=[])
                                        target_course.sections.append(sec)

                                    sec.time_slots.append(TimeSlot(
                                        day=current_day,
                                        start_time=start_time,
                                        end_time=end_time,
                                        classroom=classroom
                                    ))
                            else:
                                sec_id = 'Gr1'
                                target_course = courses_dict[code]
                                sec = next((s for s in target_course.sections if s.section_id == sec_id), None)
                                if not sec:
                                    sec = Section(section_id=sec_id, instructor='Bölüm Öğr. El.', time_slots=[])
                                    target_course.sections.append(sec)

                                sec.time_slots.append(TimeSlot(
                                    day=current_day,
                                    start_time=start_time,
                                    end_time=end_time,
                                    classroom=classroom
                                ))

                    row_idx += 1

    schedule.courses = list(courses_dict.values())
    return schedule
