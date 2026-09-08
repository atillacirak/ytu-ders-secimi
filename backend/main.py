# -*- coding: utf-8 -*-
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
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
        {'code': 'ELK', 'name': 'Elektrik Mühendisliği'},
        {'code': 'END', 'name': 'Endüstri Mühendisliği'},
        {'code': 'EHM', 'name': 'Elektronik ve Haberleşme Mühendisliği'},
        {'code': 'MAK', 'name': 'Makine Mühendisliği'}
    ]

@app.get('/api/curriculum/{dept_code}')
def get_curriculum(dept_code: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM courses WHERE department_code = ?', (dept_code,))
        rows = cursor.fetchall()
        conn.close()

        result = []
        for r in rows:
            row_dict = dict(r)
            result.append({
                'id': str(row_dict.get('id', row_dict.get('code'))),
                'code': row_dict.get('code', ''),
                'name': row_dict.get('name', ''),
                'year': row_dict.get('year', 1),
                'is_elective': bool(row_dict.get('is_elective', 0)),
                'credits': row_dict.get('credits', 3),
                'ects': row_dict.get('ects', 5),
                'instructor': row_dict.get('instructor') or 'Bölüm Öğretim Üyeleri',
                'is_online': bool(row_dict.get('is_online', 0)),
                'days': row_dict.get('days') or None,
                'semester': row_dict.get('semester') or None,
            })
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
def solve_schedules(req: GenerateScheduleRequest, department: str = Query('BLM')):
    # Basic schedule generation
    return [{'schedule': {}, 'score': 100, 'conflicts': []}]
