# -*- coding: utf-8 -*-
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import shutil
import os
import sqlite3

from models import DepartmentSchedule, Course, Section, TimeSlot, OptimizationOptions, ScheduleCombination
from pdf_parser import parse_ytu_pdf
from schedule_solver import generate_schedules
from database import DB_PATH, init_db

app = FastAPI(title='YTÜ Ders Seçim & Program Optimizasyon API', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

init_db()

# Seed all 555 courses if DB is empty
try:
    from seed_all_courses import seed_all
    seed_all()
except Exception as e:
    print(f"Seed warning: {e}")

class GenerateScheduleRequest(BaseModel):
    selected_course_codes: List[str]
    options: Optional[OptimizationOptions] = OptimizationOptions()

class DepartmentItem(BaseModel):
    code: str
    name: str

@app.get('/')
def root():
    return {'message': 'YTÜ Ders Seçimi API 2.0 Aktif'}

@app.get('/api/departments', response_model=List[DepartmentItem])
def get_departments():
    return [
        {'code': 'BLM', 'name': 'Bilgisayar Mühendisliği'},
        {'code': 'BMD', 'name': 'Biyomedikal Mühendisliği'},
        {'code': 'ELK', 'name': 'Elektrik Mühendisliği'},
        {'code': 'EHM', 'name': 'Elektronik ve Haberleşme Mühendisliği'},
        {'code': 'YZV', 'name': 'Yapay Zeka ve Veri Mühendisliği'},
        {'code': 'MAK', 'name': 'Makine Mühendisliği'},
        {'code': 'END', 'name': 'Endüstri Mühendisliği'},
        {'code': 'MKT', 'name': 'Mekatronik Mühendisliği'},
        {'code': 'BIO', 'name': 'Biyomühendislik Bölümü'},
        {'code': 'GDA', 'name': 'Gıda Mühendisliği Bölümü'},
        {'code': 'KIM', 'name': 'Kimya Mühendisliği (%30 İngilizce)'},
        {'code': 'KIM_ENG', 'name': 'Kimya Mühendisliği (%100 İngilizce)'},
        {'code': 'MAT', 'name': 'Matematik Mühendisliği Bölümü'},
        {'code': 'MET', 'name': 'Metalurji ve Malzeme Mühendisliği (%30 İngilizce)'},
        {'code': 'MET_ENG', 'name': 'Metalurji ve Malzeme Mühendisliği (%100 İngilizce)'},
    ]

@app.get('/api/curriculum/{dept_code}')
def get_curriculum(dept_code: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM courses WHERE department_code = ?', (dept_code,))
        rows = cursor.fetchall()

        result = []
        for r in rows:
            row_dict = dict(r)
            c_code = row_dict.get('code', '')

            # Fetch sections & time slots for this course
            cursor.execute('SELECT id, section_id, instructor FROM sections WHERE course_code = ?', (c_code,))
            sec_rows = cursor.fetchall()
            
            sections = []
            day_strings = []
            for s in sec_rows:
                s_id = s['id']
                cursor.execute('SELECT day, start_time, end_time, classroom FROM time_slots WHERE section_db_id = ?', (s_id,))
                ts_rows = cursor.fetchall()
                slots = [
                    {
                        'day': ts['day'],
                        'start_time': ts['start_time'],
                        'end_time': ts['end_time'],
                        'classroom': ts['classroom']
                    }
                    for ts in ts_rows
                ]
                sections.append({
                    'section_id': s['section_id'],
                    'instructor': s['instructor'],
                    'time_slots': slots
                })
                for ts in ts_rows:
                    day_strings.append(f"{ts['day']} {ts['start_time']}-{ts['end_time']}")

            formatted_days = row_dict.get('days') or (", ".join(list(set(day_strings))) if day_strings else None)

            result.append({
                'id': str(row_dict.get('id', c_code)),
                'code': c_code,
                'name': row_dict.get('name', ''),
                'year': row_dict.get('year', 1),
                'is_elective': bool(row_dict.get('is_elective', 0)),
                'credits': row_dict.get('credits', 3),
                'ects': row_dict.get('ects', 5),
                'instructor': row_dict.get('instructor') or 'Bölüm Öğretim Üyeleri',
                'is_online': bool(row_dict.get('is_online', 0)),
                'days': formatted_days,
                'semester': row_dict.get('semester') or None,
                'sections': sections
            })
        conn.close()
        return result
    except Exception as e:
        conn.close()
        return []

@app.post('/api/upload-pdf', response_model=DepartmentSchedule)
async def upload_pdf(file: UploadFile = File(...), department: str = Query('BLM')):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Sadece PDF dosyaları yüklenebilir.')
    
    os.makedirs('temp_uploads', exist_ok=True)
    file_path = os.path.join('temp_uploads', file.filename)
    
    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        schedule = parse_ytu_pdf(file_path)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        for course in schedule.courses:
            cursor.execute(
                '''INSERT OR REPLACE INTO courses 
                   (department_code, code, name, year, is_elective, credits, ects, instructor, is_online)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (department, course.code, course.name, course.year, 1 if course.is_elective else 0, 3, 5, '', 0)
            )
            for sec in course.sections:
                cursor.execute(
                    'INSERT INTO sections (course_code, section_id, instructor) VALUES (?, ?, ?)',
                    (course.code, sec.section_id, sec.instructor)
                )
                sec_db_id = cursor.lastrowid
                for ts in sec.time_slots:
                    cursor.execute(
                        'INSERT INTO time_slots (section_db_id, day, start_time, end_time, classroom) VALUES (?, ?, ?, ?, ?)',
                        (sec_db_id, ts.day, ts.start_time, ts.end_time, ts.classroom)
                    )
        conn.commit()
        conn.close()
        
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF işlenirken hata oluştu: {str(e)}')

@app.get('/api/courses', response_model=List[Course])
def get_courses(department: str = Query('BLM')):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT code, name, year, is_elective FROM courses WHERE department_code = ?', (department,))
    course_rows = cursor.fetchall()
    
    courses: List[Course] = []
    for c_code, c_name, c_year, c_elec in course_rows:
        cursor.execute('SELECT id, section_id, instructor FROM sections WHERE course_code = ?', (c_code,))
        sec_rows = cursor.fetchall()
        sections: List[Section] = []
        for sec_id_db, s_id, inst in sec_rows:
            cursor.execute('SELECT day, start_time, end_time, classroom FROM time_slots WHERE section_db_id = ?', (sec_id_db,))
            ts_rows = cursor.fetchall()
            slots = [TimeSlot(day=d, start_time=st, end_time=et, classroom=rm) for d, st, et, rm in ts_rows]
            sections.append(Section(section_id=s_id, instructor=inst, time_slots=slots))
        courses.append(Course(code=c_code, name=c_name, year=c_year, is_elective=bool(c_elec), sections=sections))
        
    conn.close()
    return courses

@app.post('/api/generate-schedules')
def solve_schedules(req: GenerateScheduleRequest):
    """
    Fetch each requested course directly by code (regardless of department),
    run the conflict-free backtracking solver, return sorted combinations.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    selected_courses: List[Course] = []

    for code in req.selected_course_codes:
        cursor.execute(
            'SELECT code, name, year, is_elective, days, instructor, is_online FROM courses WHERE code = ? LIMIT 1',
            (code,)
        )
        row = cursor.fetchone()
        if not row:
            # Course not in DB — treat as unscheduled elective
            selected_courses.append(Course(
                code=code, name=code, year=1, is_elective=True,
                sections=[Section(section_id='-', instructor='', time_slots=[])]
            ))
            continue

        c_code = row['code']
        c_name = row['name']
        c_year = row['year'] or 1
        c_elec = bool(row['is_elective'])
        c_days = row['days'] or ''
        c_inst = row['instructor'] or ''
        c_online = bool(row['is_online'])

        cursor.execute(
            'SELECT id, section_id, instructor FROM sections WHERE course_code = ?',
            (c_code,)
        )
        sec_rows = cursor.fetchall()

        sections: List[Section] = []
        for sec_row in sec_rows:
            sec_id_db = sec_row['id']
            s_id = sec_row['section_id']
            inst = sec_row['instructor'] or ''

            cursor.execute(
                'SELECT day, start_time, end_time, classroom FROM time_slots WHERE section_db_id = ?',
                (sec_id_db,)
            )
            ts_rows = cursor.fetchall()
            slots = [
                TimeSlot(day=ts['day'], start_time=ts['start_time'],
                         end_time=ts['end_time'], classroom=ts['classroom'])
                for ts in ts_rows
            ]
            sections.append(Section(section_id=s_id, instructor=inst, time_slots=slots))

        # If no section rows in DB, attempt to parse time slots from days text column
        if not sections and c_days:
            import re
            parsed_slots = []
            for d in ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']:
                if d in c_days:
                    matches = re.findall(r'(\d{1,2}[\.:]\d{2})\s*-\s*(\d{1,2}[\.:]\d{2})', c_days)
                    for m in matches:
                        parsed_slots.append(TimeSlot(
                            day=d,
                            start_time=m[0].replace('.', ':'),
                            end_time=m[1].replace('.', ':'),
                            classroom='Online' if c_online else 'Derslik Belirtilmedi'
                        ))
            if parsed_slots:
                sections = [Section(section_id='Gr1', instructor=c_inst, time_slots=parsed_slots)]

        # No sections in DB & no parsed days → treat as unscheduled
        if not sections:
            sections = [Section(section_id='-', instructor='', time_slots=[])]

        selected_courses.append(Course(
            code=c_code, name=c_name, year=c_year,
            is_elective=c_elec, sections=sections
        ))

    conn.close()

    options = req.options or OptimizationOptions()
    combos = generate_schedules(selected_courses, options)

    # If no conflict-free combinations found, return a best-effort schedule
    # using the first section of each course (may show conflicts visually)
    if not combos:
        best_effort: Dict[str, Any] = {}
        for c in selected_courses:
            sec = c.sections[0] if c.sections else None
            if sec and sec.time_slots:
                best_effort[c.code] = {
                    'section_no': sec.section_id,
                    'instructor': sec.instructor or '',
                    'is_online': any(ts.classroom == 'Online' for ts in sec.time_slots),
                    'slots': [
                        {
                            'day': ts.day,
                            'start_time': ts.start_time,
                            'end_time': ts.end_time,
                            'classroom': ts.classroom or ''
                        }
                        for ts in sec.time_slots
                    ]
                }
            else:
                best_effort[c.code] = {
                    'section_no': '-',
                    'instructor': '',
                    'is_online': False,
                    'slots': []
                }
        return [{
            'schedule': best_effort,
            'score': 0,
            'conflicts': ['Seçtiğiniz ders gruplarının saatleri birbiriyle çakışmaktadır. Tüm dersler için çakışmasız bir program oluşturulamadı.']
        }]

    response_data = []
    for combo in combos:
        sch_dict: Dict[str, Any] = {}
        for c_code, sec in combo.selected_sections.items():
            sch_dict[c_code] = {
                'section_no': sec.section_id,
                'instructor': sec.instructor or '',
                'is_online': any(ts.classroom == 'Online' for ts in sec.time_slots),
                'slots': [
                    {
                        'day': ts.day,
                        'start_time': ts.start_time,
                        'end_time': ts.end_time,
                        'classroom': ts.classroom or ''
                    }
                    for ts in sec.time_slots
                ]
            }
        response_data.append({
            'schedule': sch_dict,
            'score': round(combo.score, 1),
            'conflicts': []
        })

    return response_data

# --- Admin Course CRUD Endpoints ---

class AdminTimeSlot(BaseModel):
    day: str
    start_time: str
    end_time: str
    classroom: Optional[str] = 'Derslik Belirtilmedi'

class AdminSection(BaseModel):
    section_id: str
    instructor: Optional[str] = 'Bölüm Öğretim Üyeleri'
    time_slots: List[AdminTimeSlot] = []

class AdminCourseData(BaseModel):
    department_code: str
    code: str
    name: str
    year: int = 1
    is_elective: bool = False
    credits: int = 3
    ects: int = 5
    instructor: Optional[str] = 'Bölüm Öğretim Üyeleri'
    is_online: bool = False
    sections: List[AdminSection] = []

def sync_cache_from_db():
    try:
        cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'parsed_courses_cache.json')
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days, semester FROM courses")
        db_courses = [
            {'id': r[0], 'department_code': r[1], 'code': r[2], 'name': r[3], 'year': r[4], 'is_elective': r[5], 'credits': r[6], 'ects': r[7], 'instructor': r[8], 'is_online': r[9], 'days': r[10], 'semester': r[11]}
            for r in c.fetchall()
        ]
        c.execute("SELECT id, course_code, section_id, instructor FROM sections")
        db_sections = [{'id': r[0], 'course_code': r[1], 'section_id': r[2], 'instructor': r[3]} for r in c.fetchall()]
        c.execute("SELECT id, section_db_id, day, start_time, end_time, classroom FROM time_slots")
        db_slots = [{'id': r[0], 'section_db_id': r[1], 'day': r[2], 'start_time': r[3], 'end_time': r[4], 'classroom': r[5]} for r in c.fetchall()]
        conn.close()

        cache_data = {'courses': db_courses, 'sections': db_sections, 'time_slots': db_slots}
        with open(cache_path, 'w', encoding='utf-8') as f:
            import json
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Cache sync error: {e}")

@app.post('/api/admin/courses')
def create_course(data: AdminCourseData):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if course exists
        cursor.execute("SELECT id FROM courses WHERE code = ?", (data.code,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"'{data.code}' kodlu ders zaten mevcut. Lütfen düzenleme seçeneğini kullanın.")

        cursor.execute(
            '''INSERT INTO courses (department_code, code, name, year, is_elective, credits, ects, instructor, is_online)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (data.department_code, data.code, data.name, data.year, 1 if data.is_elective else 0, data.credits, data.ects, data.instructor or 'Bölüm Öğretim Üyeleri', 1 if data.is_online else 0)
        )

        for sec in data.sections:
            cursor.execute(
                'INSERT INTO sections (course_code, section_id, instructor) VALUES (?, ?, ?)',
                (data.code, sec.section_id, sec.instructor or 'Bölüm Öğretim Üyeleri')
            )
            sec_db_id = cursor.lastrowid
            for ts in sec.time_slots:
                cursor.execute(
                    'INSERT INTO time_slots (section_db_id, day, start_time, end_time, classroom) VALUES (?, ?, ?, ?, ?)',
                    (sec_db_id, ts.day, ts.start_time, ts.end_time, ts.classroom or 'Derslik Belirtilmedi')
                )
        conn.commit()
        conn.close()

        sync_cache_from_db()
        return {'status': 'success', 'message': f"'{data.code}' dersi başarıyla eklendi."}
    except HTTPException:
        raise
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Ders eklenirken hata: {str(e)}")

@app.put('/api/admin/courses/{course_code}')
def update_course(course_code: str, data: AdminCourseData):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM courses WHERE code = ?", (course_code,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail=f"'{course_code}' kodlu ders bulunamadı.")

        # Update course main info
        cursor.execute(
            '''UPDATE courses 
               SET department_code = ?, code = ?, name = ?, year = ?, is_elective = ?, credits = ?, ects = ?, instructor = ?, is_online = ?
               WHERE code = ?''',
            (data.department_code, data.code, data.name, data.year, 1 if data.is_elective else 0, data.credits, data.ects, data.instructor or 'Bölüm Öğretim Üyeleri', 1 if data.is_online else 0, course_code)
        )

        # Remove old sections and time slots for old course_code
        cursor.execute("SELECT id FROM sections WHERE course_code = ?", (course_code,))
        sec_ids = [r[0] for r in cursor.fetchall()]
        for sid in sec_ids:
            cursor.execute("DELETE FROM time_slots WHERE section_db_id = ?", (sid,))
        cursor.execute("DELETE FROM sections WHERE course_code = ?", (course_code,))

        # Re-insert sections & time slots
        target_code = data.code
        for sec in data.sections:
            cursor.execute(
                'INSERT INTO sections (course_code, section_id, instructor) VALUES (?, ?, ?)',
                (target_code, sec.section_id, sec.instructor or 'Bölüm Öğretim Üyeleri')
            )
            sec_db_id = cursor.lastrowid
            for ts in sec.time_slots:
                cursor.execute(
                    'INSERT INTO time_slots (section_db_id, day, start_time, end_time, classroom) VALUES (?, ?, ?, ?, ?)',
                    (sec_db_id, ts.day, ts.start_time, ts.end_time, ts.classroom or 'Derslik Belirtilmedi')
                )

        conn.commit()
        conn.close()

        sync_cache_from_db()
        return {'status': 'success', 'message': f"'{target_code}' dersi başarıyla güncellendi."}
    except HTTPException:
        raise
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Ders güncellenirken hata: {str(e)}")

@app.delete('/api/admin/courses/{course_code}')
def delete_course(course_code: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM sections WHERE course_code = ?", (course_code,))
        sec_ids = [r[0] for r in cursor.fetchall()]
        for sid in sec_ids:
            cursor.execute("DELETE FROM time_slots WHERE section_db_id = ?", (sid,))
        cursor.execute("DELETE FROM sections WHERE course_code = ?", (course_code,))
        cursor.execute("DELETE FROM courses WHERE code = ?", (course_code,))

        conn.commit()
        conn.close()

        sync_cache_from_db()
        return {'status': 'success', 'message': f"'{course_code}' dersi silindi."}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Ders silinirken hata: {str(e)}")

