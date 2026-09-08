# -*- coding: utf-8 -*-
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import shutil
import os

from models import DepartmentSchedule, Course, OptimizationOptions, ScheduleCombination
from pdf_parser import parse_ytu_pdf
from schedule_solver import generate_schedules

app = FastAPI(title='YTÜ Ders Seçim & Program Optimizasyon API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

STORED_SCHEDULE: Optional[DepartmentSchedule] = None

class GenerateScheduleRequest(BaseModel):
    selected_course_codes: List[str]
    options: OptimizationOptions

@app.get('/')
def root():
    return {'message': 'YTÜ Ders Seçimi API Aktif'}

@app.post('/api/upload-pdf', response_model=DepartmentSchedule)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Sadece PDF dosyaları yüklenebilir.')
    
    os.makedirs('temp_uploads', exist_ok=True)
    file_path = os.path.join('temp_uploads', file.filename)
    
    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        schedule = parse_ytu_pdf(file_path)
        global STORED_SCHEDULE
        STORED_SCHEDULE = schedule
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF işlenirken hata oluştu: {str(e)}')

@app.get('/api/courses', response_model=List[Course])
def get_courses():
    if not STORED_SCHEDULE:
        return []
    return STORED_SCHEDULE.courses

@app.post('/api/generate-schedules', response_model=List[ScheduleCombination])
def solve_schedules(req: GenerateScheduleRequest):
    if not STORED_SCHEDULE:
        raise HTTPException(status_code=400, detail='Henüz ders programı PDF yüklenmedi.')
    
    selected_courses = [c for c in STORED_SCHEDULE.courses if c.code in req.selected_course_codes]
    if not selected_courses:
        raise HTTPException(status_code=400, detail='Geçerli ders seçilmedi.')
        
    results = generate_schedules(selected_courses, req.options)
    return results
