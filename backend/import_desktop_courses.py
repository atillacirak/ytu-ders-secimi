# -*- coding: utf-8 -*-
import os
import re
import sqlite3
import json
import pdfplumber
import pandas as pd
from database import DB_PATH, init_db

init_db()

DESKTOP_DIR = r"C:\Users\ati_c\OneDrive\Desktop\ders seçim"
if not os.path.exists(DESKTOP_DIR):
    DESKTOP_DIR = r"C:\Users\ati_c\Desktop\ders seçim"

CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'parsed_courses_cache.json')

DEPT_MAPPING = {
    "biyomudhendislik": ("BIO", "Biyomühendislik"),
    "biyomühendislik": ("BIO", "Biyomühendislik"),
    "bilgisayar": ("BLM", "Bilgisayar Mühendisliği"),
    "biyomedikal": ("BMD", "Biyomedikal Mühendisliği"),
    "elektronik": ("EHM", "Elektronik ve Haberleşme Mühendisliği"),
    "elektrik": ("ELK", "Elektrik Mühendisliği"),
    "endustri": ("END", "Endüstri Mühendisliği"),
    "endüstri": ("END", "Endüstri Mühendisliği"),
    "gida": ("GDA", "Gıda Mühendisliği"),
    "gıda": ("GDA", "Gıda Mühendisliği"),
    "kimya %100": ("KIM_ENG", "Kimya Mühendisliği (%100 İngilizce)"),
    "kimya %30": ("KIM", "Kimya Mühendisliği (%30 İngilizce)"),
    "makine": ("MAK", "Makine Mühendisliği"),
    "mat müh": ("MAT", "Matematik Mühendisliği"),
    "matematik": ("MAT", "Matematik Mühendisliği"),
    "metalurji %100": ("MET_ENG", "Metalurji ve Malzeme Mühendisliği (%100 İngilizce)"),
    "metalurji %30": ("MET", "Metalurji ve Malzeme Mühendisliği (%30 İngilizce)"),
    "mekatronik": ("MKT", "Mekatronik Mühendisliği"),
    "yapay zeka": ("YZV", "Yapay Zeka Mühendisliği"),
}

PAGE_DAYS = {0: 'Pazartesi', 1: 'Salı', 2: 'Çarşamba', 3: 'Perşembe', 4: 'Cuma', 5: 'Cumartesi'}
DAYS_LIST = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ']
DAY_TITLE_MAP = {
    'PAZARTESİ': 'Pazartesi', 'SALI': 'Salı', 'ÇARŞAMBA': 'Çarşamba',
    'PERŞEMBE': 'Perşembe', 'CUMA': 'Cuma', 'CUMARTESİ': 'Cumartesi'
}

CODE_RE = re.compile(r"([A-ZÇĞİÖŞÜ]{2,6}\d{3,5}(?:\.\d{2})?)")
TIME_RE = re.compile(r"(\d{1,2})[\.:](\d{2})\s*-\s*(\d{1,2})[\.:](\d{2})")

def get_dept_code(filename):
    fname_lower = filename.lower()
    for key, (code, name) in DEPT_MAPPING.items():
        if key in fname_lower:
            return code, name
    return "GENEL", "Genel Mühendislik"

def process_pdf_schedule_universal(file_path, default_dept_code):
    courses_dict = {}

    with pdfplumber.open(file_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            page_day = PAGE_DAYS.get(page_idx, 'Pazartesi')

            for table in tables:
                if not table: continue

                header_row = [str(c or '').strip() for c in table[0]]
                hour_cols = {}

                for c_idx, cell_txt in enumerate(header_row):
                    tm = TIME_RE.search(cell_txt)
                    if tm:
                        s_t = f"{int(tm.group(1)):02d}.{tm.group(2)}"
                        e_t = f"{int(tm.group(3)):02d}.{tm.group(4)}"
                        hour_cols[c_idx] = (s_t, e_t)

                # Layout 1: Horizontal Matrix (Hours in columns e.g. Makine Müh)
                if len(hour_cols) >= 3:
                    current_year = 1
                    for row in table[1:]:
                        if not row: continue
                        yr_match = re.search(r'\b([1-4])\b', str(row[1] or ''))
                        if yr_match:
                            current_year = int(yr_match.group(1))

                        for c_idx, (start_t, end_t) in hour_cols.items():
                            if c_idx >= len(row): continue
                            cell_val = str(row[c_idx] or '').strip()
                            if not cell_val: continue

                            lines = [l.strip() for l in cell_val.split('\n') if l.strip()]
                            for line in lines:
                                m = CODE_RE.search(line)
                                if m:
                                    raw_code = m.group(1)
                                    base_code = raw_code.split('.')[0]
                                    sec_no = f"Gr{raw_code.split('.')[1]}" if '.' in raw_code else 'Gr1'

                                    name = lines[0] if len(lines) > 0 else base_code
                                    inst = lines[1] if len(lines) > 1 else ''
                                    room = lines[2] if len(lines) > 2 else ('Online' if 'ONLINE' in cell_val.upper() else 'Derslik')

                                    add_course_slot(courses_dict, default_dept_code, base_code, name, current_year, sec_no, inst, page_day, start_t, end_t, room)

                # Layout 2: Vertical Column Layout (Hours in rows e.g. Metalurji, Kimya, Mekatronik)
                else:
                    col_year_map = {}
                    for r_idx in range(min(5, len(table))):
                        r_cells = table[r_idx]
                        if not r_cells: continue
                        for c_idx, cell in enumerate(r_cells):
                            if cell:
                                txt = str(cell).replace('\n', ' ')
                                if '1. Sınıf' in txt or '1.Sınıf' in txt or 'First Grade' in txt: col_year_map[c_idx] = 1
                                elif '2. Sınıf' in txt or '2.Sınıf' in txt or 'Second Grade' in txt: col_year_map[c_idx] = 2
                                elif '3. Sınıf' in txt or '3.Sınıf' in txt or 'Third Grade' in txt: col_year_map[c_idx] = 3
                                elif '4. Sınıf' in txt or '4.Sınıf' in txt or 'Fourth Grade' in txt: col_year_map[c_idx] = 4

                    last_yr = 1
                    for c_idx in range(max(len(r) for r in table if r)):
                        if c_idx in col_year_map: last_yr = col_year_map[c_idx]
                        else: col_year_map[c_idx] = last_yr

                    current_day = page_day

                    for row in table:
                        if not row: continue
                        row_str = " ".join([str(c or '') for c in row])

                        for d in DAYS_LIST:
                            if d in row_str.upper():
                                current_day = DAY_TITLE_MAP[d]
                                break

                        time_match = None
                        for cell in row:
                            if cell:
                                tm = TIME_RE.search(str(cell))
                                if tm:
                                    time_match = (f"{int(tm.group(1)):02d}.{tm.group(2)}", f"{int(tm.group(3)):02d}.{tm.group(4)}")
                                    break
                        if not time_match: continue

                        for c_idx, cell in enumerate(row):
                            if not cell: continue
                            cell_txt = str(cell).strip()
                            if not cell_txt: continue

                            codes = CODE_RE.findall(cell_txt)
                            for raw_code in codes:
                                if raw_code in ['SAAT', 'GÜN', 'GÜNLER', 'SINIF', 'YILI', 'DERS', 'PROGRAMI', 'FAKÜLTESİ']: continue
                                base_code = raw_code.split('.')[0]
                                sec_no = f"Gr{raw_code.split('.')[1]}" if '.' in raw_code else 'Gr1'

                                lines = [l.strip() for l in cell_txt.split('\n') if l.strip()]
                                clean_name = lines[0] if lines else base_code
                                
                                gr_matches = re.findall(r'(Gr:?\s*\d+|Gr\d+)', cell_txt, re.IGNORECASE)
                                if gr_matches and sec_no == 'Gr1':
                                    sec_no = gr_matches[0].replace(' ', '').replace(':', '')

                                room_match = re.search(r'(KMB\s?\d+|D\d{3}|DB\d{2}|D007|Online|ON LINE)', cell_txt, re.IGNORECASE)
                                classroom = room_match.group(0) if room_match else ('Online' if 'ONLINE' in cell_txt.upper() else 'Derslik')

                                add_course_slot(courses_dict, default_dept_code, base_code, clean_name, col_year_map.get(c_idx, 1), sec_no, '', current_day, time_match[0], time_match[1], classroom)

    return list(courses_dict.values())

def add_course_slot(courses_dict, dept_code, code, name, year, sec_id, instructor, day, start_t, end_t, classroom):
    if code not in courses_dict:
        courses_dict[code] = {
            'dept': dept_code,
            'code': code,
            'name': name,
            'year': year,
            'is_elective': 1 if (year >= 3 or code.startswith(('MSE4', 'MSE3', 'MAK4', 'END4', 'KMM4', 'BME4', 'ELM4'))) else 0,
            'credits': 3,
            'ects': 5,
            'is_online': 1 if classroom.lower() == 'online' else 0,
            'days': set([day]),
            'sections': {}
        }
    else:
        courses_dict[code]['days'].add(day)

    sec_map = courses_dict[code]['sections']
    if sec_id not in sec_map:
        sec_map[sec_id] = {
            'section_id': sec_id,
            'instructor': instructor or 'Bölüm Öğr. El.',
            'time_slots': []
        }

    sec_map[sec_id]['time_slots'].append({
        'day': day,
        'start_time': start_t,
        'end_time': end_t,
        'classroom': classroom
    })

def parse_and_seed_comprehensive():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    files = [f for f in os.listdir(DESKTOP_DIR) if f.endswith('.pdf')]
    print(f"Processing {len(files)} PDF files in Desktop directory...")

    cache_data = []

    for fname in files:
        fpath = os.path.join(DESKTOP_DIR, fname)
        dept_code, dept_name = get_dept_code(fname)

        courses = process_pdf_schedule_universal(fpath, dept_code)

        for c in courses:
            cursor.execute(
                '''INSERT OR REPLACE INTO courses 
                   (department_code, code, name, year, is_elective, credits, ects, instructor, is_online)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (c['dept'], c['code'], c['name'], c['year'], c['is_elective'], c['credits'], c['ects'], '', c['is_online'])
            )

            sec_list_json = []
            for sec_id, sec_data in c['sections'].items():
                cursor.execute(
                    'INSERT INTO sections (course_code, section_id, instructor) VALUES (?, ?, ?)',
                    (c['code'], sec_id, sec_data['instructor'])
                )
                sec_db_id = cursor.lastrowid

                for ts in sec_data['time_slots']:
                    cursor.execute(
                        'INSERT INTO time_slots (section_db_id, day, start_time, end_time, classroom) VALUES (?, ?, ?, ?, ?)',
                        (sec_db_id, ts['day'], ts['start_time'], ts['end_time'], ts['classroom'])
                    )

    conn.commit()
    conn.close()

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        courses = [dict(r) for r in conn.execute('SELECT * FROM courses').fetchall()]
        sections = [dict(r) for r in conn.execute('SELECT * FROM sections').fetchall()]
        time_slots = [dict(r) for r in conn.execute('SELECT * FROM time_slots').fetchall()]
        conn.close()

        cache_data = {'courses': courses, 'sections': sections, 'time_slots': time_slots}
        cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        os.makedirs(cache_dir, exist_ok=True)
        cache_path = os.path.join(cache_dir, 'parsed_courses_cache.json')
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        print(f"Parsed courses cached to {cache_path}")
    except Exception as e:
        print(f"JSON cache saving warning: {e}")

    print("Tüm ders programları başarıyla işlendi!")

if __name__ == '__main__':
    parse_and_seed_comprehensive()
